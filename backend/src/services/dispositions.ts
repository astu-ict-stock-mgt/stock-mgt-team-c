import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { recordAudit, AuditContext } from "./audit";
import { consumeFifoTx, nextTxnCode } from "./fifo-consume";
import { refreshItemStatus } from "./item-status";

/**
 * Damaged and obsolete stock.
 *
 * REPORTED ──approve──▶ APPROVED ──dispose──▶ DISPOSED
 *     └───────────── cancel ─────────────┘
 *
 * DamagedStock and ObsoleteStock are field-identical in the schema, so one
 * implementation serves both rather than two near-copies drifting apart. `kind`
 * picks the table, the permission, the transaction type and the wording.
 *
 * Stock does NOT move on report or approve — a broken crate is still sitting on
 * the shelf and still belongs on the books. The single stock movement happens at
 * disposal, which is when the goods physically leave.
 */

export type DispositionKind = "damaged" | "obsolete";

type KindConfig = {
  label: string;
  module: string;
  txnType: "DAMAGE" | "OBSOLETE";
  auditEntity: string;
};

const KINDS: Record<DispositionKind, KindConfig> = {
  damaged: { label: "Damaged stock", module: "damaged", txnType: "DAMAGE", auditEntity: "damagedStock" },
  obsolete: { label: "Obsolete stock", module: "obsolete", txnType: "OBSOLETE", auditEntity: "obsoleteStock" },
};

// Both Prisma models expose the same delegate surface, so one narrowed handle
// avoids branching on `kind` at every call site below.
function delegate(kind: DispositionKind) {
  return kind === "damaged" ? prisma.damagedStock : prisma.obsoleteStock;
}
function txDelegate(tx: Prisma.TransactionClient, kind: DispositionKind) {
  return kind === "damaged" ? tx.damagedStock : tx.obsoleteStock;
}

type Row = {
  id: string;
  itemId: string;
  storeId: string | null;
  quantity: number;
  reason: string;
  reportedById: string;
  status: string;
  disposalDate: Date | null;
  disposalMethod: string | null;
  createdAt: Date;
  updatedAt: Date;
  item: { id: string; code: string; name: string; uom: { code: string } };
};

const ITEM_INCLUDE = { item: { include: { uom: true } } } as const;

/**
 * `reportedById` and `storeId` are plain scalars in the schema with no relation
 * declared, so they cannot be `include`d. One batched lookup per page keeps this
 * off the N+1 path that §3.3 of the backlog complains about elsewhere.
 */
async function resolveRefs(rows: Row[]) {
  const userIds = [...new Set(rows.map((r) => r.reportedById))];
  const storeIds = [...new Set(rows.map((r) => r.storeId).filter((s): s is string => !!s))];

  const [users, stores] = await Promise.all([
    userIds.length
      ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } })
      : Promise.resolve([]),
    storeIds.length
      ? prisma.store.findMany({ where: { id: { in: storeIds } }, select: { id: true, code: true, name: true } })
      : Promise.resolve([]),
  ]);

  return {
    users: new Map(users.map((u) => [u.id, u])),
    stores: new Map(stores.map((s) => [s.id, s])),
  };
}

function serialize(
  r: Row,
  refs: { users: Map<string, { id: string; fullName: string }>; stores: Map<string, { id: string; code: string; name: string }> }
) {
  return {
    id: r.id,
    item: { id: r.item.id, code: r.item.code, name: r.item.name, uom: r.item.uom.code },
    store: r.storeId ? refs.stores.get(r.storeId) ?? null : null,
    quantity: r.quantity,
    reason: r.reason,
    reportedBy: refs.users.get(r.reportedById) ?? null,
    status: r.status,
    disposalDate: r.disposalDate?.toISOString() ?? null,
    disposalMethod: r.disposalMethod,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function listDispositions(kind: DispositionKind, params: {
  page: number; limit: number; itemId?: string; storeId?: string; status?: string; search?: string;
}) {
  const where: Record<string, unknown> = {};
  if (params.itemId) where.itemId = params.itemId;
  if (params.storeId) where.storeId = params.storeId;
  if (params.status) where.status = params.status;
  if (params.search) {
    where.OR = [
      { reason: { contains: params.search } },
      { item: { code: { contains: params.search } } },
      { item: { name: { contains: params.search } } },
    ];
  }

  const d = delegate(kind);
  const [total, rows] = await Promise.all([
    (d as any).count({ where }),
    (d as any).findMany({
      where, orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit, take: params.limit,
      include: ITEM_INCLUDE,
    }) as Promise<Row[]>,
  ]);

  const refs = await resolveRefs(rows);
  return { total, items: rows.map((r) => serialize(r, refs)) };
}

export async function getDisposition(kind: DispositionKind, id: string) {
  const row = (await (delegate(kind) as any).findUnique({ where: { id }, include: ITEM_INCLUDE })) as Row | null;
  if (!row) throw Errors.notFound(KINDS[kind].label, id);
  const refs = await resolveRefs([row]);
  return serialize(row, refs);
}

/**
 * Flags a quantity as damaged or obsolete. No stock movement — see the file
 * header. The quantity is checked against what the store actually holds so a
 * disposal cannot later be blocked by an impossible report.
 */
export async function reportDisposition(
  kind: DispositionKind,
  input: { itemId: string; storeId: string; quantity: number; reason: string; reportedById: string },
  auditCtx?: AuditContext
) {
  const cfg = KINDS[kind];
  if (input.quantity <= 0) throw Errors.validation("Quantity must be greater than zero");

  const item = await prisma.inventoryItem.findFirst({
    where: { id: input.itemId, deletedAt: null },
    select: { id: true, code: true, name: true },
  });
  if (!item) throw Errors.notFound("Inventory item", input.itemId);

  const store = await prisma.store.findFirst({
    where: { id: input.storeId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!store) throw Errors.notFound("Store", input.storeId);

  const stock = await prisma.storeStock.findUnique({
    where: { itemId_storeId: { itemId: input.itemId, storeId: input.storeId } },
  });
  const onHand = stock?.quantity ?? 0;

  // Everything already flagged but not yet disposed is still counted in onHand,
  // so it has to be netted off or the same units could be reported twice.
  const [pendingDamaged, pendingObsolete] = await Promise.all([
    prisma.damagedStock.aggregate({
      where: { itemId: input.itemId, storeId: input.storeId, status: { in: ["REPORTED", "APPROVED"] } },
      _sum: { quantity: true },
    }),
    prisma.obsoleteStock.aggregate({
      where: { itemId: input.itemId, storeId: input.storeId, status: { in: ["REPORTED", "APPROVED"] } },
      _sum: { quantity: true },
    }),
  ]);
  const alreadyFlagged = (pendingDamaged._sum.quantity ?? 0) + (pendingObsolete._sum.quantity ?? 0);
  const available = onHand - alreadyFlagged;

  if (input.quantity > available) {
    throw Errors.validation(
      alreadyFlagged > 0
        ? `Cannot flag ${input.quantity} of ${item.code} — ${store.name} holds ${onHand}, of which ${alreadyFlagged} is already awaiting disposal`
        : `Cannot flag ${input.quantity} of ${item.code} — ${store.name} only holds ${onHand}`
    );
  }

  const created = await (delegate(kind) as any).create({
    data: {
      itemId: input.itemId, storeId: input.storeId, quantity: input.quantity,
      reason: input.reason, reportedById: input.reportedById, status: "REPORTED",
    },
  });

  await recordAudit({
    ctx: auditCtx,
    action: kind === "damaged" ? "DAMAGED_REPORTED" : "OBSOLETE_REPORTED",
    module: cfg.module, entity: cfg.auditEntity, entityId: created.id,
    newValue: { itemCode: item.code, storeId: input.storeId, quantity: input.quantity, reason: input.reason },
    description: `Reported ${input.quantity} x ${item.code} as ${kind} in ${store.name}`,
  });

  return getDisposition(kind, created.id);
}

/**
 * REPORTED → APPROVED.
 *
 * Deliberately no self-approval guard, unlike stock take. `damaged.manage` is a
 * single permission covering both reporting and approving, and STOREKEEPER holds
 * it alone — a guard here would leave a one-storekeeper store unable to dispose
 * of anything. Separating these is an analyst decision (backlog Part 4) and needs
 * a new permission before it can be enforced in code.
 */
export async function approveDisposition(
  kind: DispositionKind, id: string, approvedById: string, auditCtx?: AuditContext
) {
  const cfg = KINDS[kind];
  const row = (await (delegate(kind) as any).findUnique({ where: { id }, include: ITEM_INCLUDE })) as Row | null;
  if (!row) throw Errors.notFound(cfg.label, id);
  if (row.status !== "REPORTED") {
    throw Errors.invalidDisposition(
      `Only a reported record can be approved — this one is ${row.status.toLowerCase()}`
    );
  }

  await (delegate(kind) as any).update({ where: { id }, data: { status: "APPROVED" } });

  await recordAudit({
    ctx: auditCtx,
    action: kind === "damaged" ? "DAMAGED_APPROVED" : "OBSOLETE_APPROVED",
    module: cfg.module, entity: cfg.auditEntity, entityId: id,
    oldValue: { status: "REPORTED" }, newValue: { status: "APPROVED", approvedById },
    description: `Approved disposal of ${row.quantity} x ${row.item.code}`,
  });

  return getDisposition(kind, id);
}

/**
 * APPROVED → DISPOSED. This is the only step that moves stock: the goods leave
 * the store, so FIFO layers are consumed oldest-first and a DAMAGE / OBSOLETE
 * transaction records the loss at the cost the units were actually carried at.
 */
export async function disposeDisposition(
  kind: DispositionKind,
  id: string,
  input: { disposalMethod: string; disposedById: string },
  auditCtx?: AuditContext
) {
  const cfg = KINDS[kind];
  const row = (await (delegate(kind) as any).findUnique({ where: { id }, include: ITEM_INCLUDE })) as Row | null;
  if (!row) throw Errors.notFound(cfg.label, id);
  if (row.status !== "APPROVED") {
    throw Errors.invalidDisposition(
      row.status === "DISPOSED"
        ? "This record has already been disposed"
        : `Disposal needs approval first — this record is ${row.status.toLowerCase()}`
    );
  }
  if (!row.storeId) {
    throw Errors.invalidDisposition("This record has no store, so there is no stock to remove");
  }

  const storeId = row.storeId;
  let cogs = 0;

  await prisma.$transaction(async (tx) => {
    const stock = await tx.storeStock.findUnique({
      where: { itemId_storeId: { itemId: row.itemId, storeId } },
    });
    const balanceBefore = stock?.quantity ?? 0;
    if (balanceBefore < row.quantity) {
      throw Errors.insufficientStock(row.item.code, row.quantity, balanceBefore);
    }

    // Throws insufficientStock of its own accord if the layers cannot cover it.
    const { totalCogs, avgUnitCost } = await consumeFifoTx(tx, {
      itemId: row.itemId, storeId, quantity: row.quantity,
    });
    cogs = totalCogs;

    const balanceAfter = balanceBefore - row.quantity;
    await tx.storeStock.update({ where: { id: stock!.id }, data: { quantity: balanceAfter } });

    const txnCode = await nextTxnCode(tx);
    await tx.stockTransaction.create({
      data: {
        code: txnCode, itemId: row.itemId, storeId, type: cfg.txnType,
        quantity: -row.quantity, unitCost: avgUnitCost,
        balanceBefore, balanceAfter,
        referenceType: cfg.txnType, referenceId: row.id, userId: input.disposedById,
        remarks: `${cfg.label} disposal — ${input.disposalMethod}: ${row.reason}`,
      },
    });

    await txDelegate(tx, kind).update({
      where: { id },
      data: { status: "DISPOSED", disposalDate: new Date(), disposalMethod: input.disposalMethod },
    });

    await refreshItemStatus(tx, row.itemId);
  });

  await recordAudit({
    ctx: auditCtx,
    action: kind === "damaged" ? "DAMAGED_DISPOSED" : "OBSOLETE_DISPOSED",
    module: cfg.module, entity: cfg.auditEntity, entityId: id,
    oldValue: { status: "APPROVED" },
    newValue: {
      status: "DISPOSED", itemCode: row.item.code, quantity: row.quantity,
      disposalMethod: input.disposalMethod, cogs,
    },
    description: `Disposed ${row.quantity} x ${row.item.code} by ${input.disposalMethod} (loss ${cogs.toFixed(2)})`,
  });

  return getDisposition(kind, id);
}

export async function cancelDisposition(
  kind: DispositionKind, id: string, auditCtx?: AuditContext
) {
  const cfg = KINDS[kind];
  const row = (await (delegate(kind) as any).findUnique({ where: { id }, include: ITEM_INCLUDE })) as Row | null;
  if (!row) throw Errors.notFound(cfg.label, id);
  if (!["REPORTED", "APPROVED"].includes(row.status)) {
    throw Errors.invalidDisposition(
      row.status === "DISPOSED"
        ? "The goods are already gone — a disposed record cannot be cancelled"
        : "This record is already cancelled"
    );
  }

  await (delegate(kind) as any).update({ where: { id }, data: { status: "CANCELLED" } });

  await recordAudit({
    ctx: auditCtx,
    action: kind === "damaged" ? "DAMAGED_CANCELLED" : "OBSOLETE_CANCELLED",
    module: cfg.module, entity: cfg.auditEntity, entityId: id,
    oldValue: { status: row.status }, newValue: { status: "CANCELLED" },
    description: `Cancelled ${kind} record for ${row.quantity} x ${row.item.code}`,
  });

  return getDisposition(kind, id);
}
