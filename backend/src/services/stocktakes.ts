import { Prisma, StockTakeStatus } from "@prisma/client";
import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { recordAudit, AuditContext } from "./audit";
import { consumeFifoTx, nextTxnCode } from "./fifo-consume";
import { refreshItemStatus } from "./item-status";
import { nextDocumentCode, withUniqueRetry } from "../utils/document-code";

/**
 * Physical stock counting (SRS: at least once a year).
 *
 * DRAFT ──counts──▶ IN_PROGRESS ──complete──▶ COMPLETED ──reconcile──▶ RECONCILED
 *
 * Nothing touches real stock until `reconcileStockTake`. Up to that point a stock
 * take is a worksheet: the system quantity is frozen at creation so the count is
 * measured against what the books said *when counting started*, not against a
 * figure that keeps moving while the storekeeper walks the shelves.
 */

// A store may only have one count open at a time — see createStockTake.
const OPEN_STATUSES: StockTakeStatus[] = ["DRAFT", "IN_PROGRESS"];

const DETAIL_INCLUDE = {
  store: true,
  conductedBy: true,
  items: { include: { item: { include: { uom: true } } } },
} satisfies Prisma.StockTakeInclude;

type StockTakeDetail = Prisma.StockTakeGetPayload<{ include: typeof DETAIL_INCLUDE }>;

function serialize(s: StockTakeDetail) {
  const counted = s.items.filter((i) => i.physicalQty !== null);
  const varianceLines = s.items.filter((i) => (i.variance ?? 0) !== 0);
  return {
    id: s.id,
    code: s.code,
    store: { id: s.store.id, code: s.store.code, name: s.store.name },
    conductedBy: { id: s.conductedBy.id, fullName: s.conductedBy.fullName },
    status: s.status,
    startDate: s.startDate.toISOString(),
    endDate: s.endDate?.toISOString() ?? null,
    notes: s.notes,
    itemCount: s.items.length,
    countedCount: counted.length,
    varianceCount: varianceLines.length,
    // Signed, so the two sides do not cancel out in the summary the way a plain
    // sum of variances would.
    surplusQty: varianceLines.reduce((t, i) => t + Math.max(0, i.variance ?? 0), 0),
    shortageQty: varianceLines.reduce((t, i) => t + Math.max(0, -(i.variance ?? 0)), 0),
    items: s.items.map((i) => ({
      id: i.id,
      itemId: i.itemId,
      itemCode: i.item.code,
      itemName: i.item.name,
      uom: i.item.uom.code,
      systemQty: i.systemQty,
      physicalQty: i.physicalQty,
      variance: i.variance,
      remarks: i.remarks,
    })),
  };
}

export async function listStockTakes(params: {
  page: number; limit: number; search?: string; storeId?: string; status?: string;
}) {
  const where: Prisma.StockTakeWhereInput = {};
  if (params.search) where.code = { contains: params.search };
  if (params.storeId) where.storeId = params.storeId;
  // "OPEN" is a convenience for both unfinished states at once. The notification
  // bell counts DRAFT and IN_PROGRESS together, so filtering on either one alone
  // would show fewer rows than the badge promised.
  if (params.status === "OPEN") where.status = { in: OPEN_STATUSES };
  else if (params.status) where.status = params.status as any;

  const [total, rows] = await Promise.all([
    prisma.stockTake.count({ where }),
    prisma.stockTake.findMany({
      where, orderBy: { startDate: "desc" },
      skip: (params.page - 1) * params.limit, take: params.limit,
      include: { store: true, conductedBy: true, items: { select: { physicalQty: true, variance: true } } },
    }),
  ]);

  return { total, items: rows.map((s) => ({
    id: s.id, code: s.code,
    store: { id: s.store.id, code: s.store.code, name: s.store.name },
    conductedBy: { id: s.conductedBy.id, fullName: s.conductedBy.fullName },
    status: s.status,
    startDate: s.startDate.toISOString(),
    endDate: s.endDate?.toISOString() ?? null,
    notes: s.notes,
    itemCount: s.items.length,
    countedCount: s.items.filter((i) => i.physicalQty !== null).length,
    varianceCount: s.items.filter((i) => (i.variance ?? 0) !== 0).length,
  })) };
}

export async function getStockTake(id: string) {
  const s = await prisma.stockTake.findUnique({ where: { id }, include: DETAIL_INCLUDE });
  if (!s) throw Errors.notFound("Stock take", id);
  return serialize(s);
}

/**
 * Opens a count and freezes the system quantity for every line.
 *
 * Without `itemIds` the sheet is the store's current holdings. Pass `itemIds` to
 * count a subset — including items with no stock row in this store at all, whose
 * system quantity is then 0, which is how "found in the wrong store" gets caught.
 */
export async function createStockTake(
  input: { storeId: string; conductedById: string; notes?: string; itemIds?: string[] },
  auditCtx?: AuditContext
) {
  const store = await prisma.store.findFirst({ where: { id: input.storeId, deletedAt: null } });
  if (!store) throw Errors.notFound("Store", input.storeId);

  // Two open counts on one store would each hold their own frozen systemQty and
  // both apply their variance on reconcile, so the second would double-correct.
  const open = await prisma.stockTake.findFirst({
    where: { storeId: input.storeId, status: { in: OPEN_STATUSES } },
  });
  if (open) {
    throw Errors.conflict(
      `${store.name} already has an open stock take (${open.code}) — complete or delete it before starting another`
    );
  }

  let lines: Array<{ itemId: string; systemQty: number }>;

  if (input.itemIds?.length) {
    const itemIds = [...new Set(input.itemIds)];
    const items = await prisma.inventoryItem.findMany({
      where: { id: { in: itemIds }, deletedAt: null },
      select: { id: true },
    });
    const known = new Set(items.map((i) => i.id));
    const missing = itemIds.filter((id) => !known.has(id));
    if (missing.length) throw Errors.notFound("Inventory item", missing.join(", "));

    const rows = await prisma.storeStock.findMany({
      where: { storeId: input.storeId, itemId: { in: itemIds } },
      select: { itemId: true, quantity: true },
    });
    const onHand = new Map(rows.map((r) => [r.itemId, r.quantity]));
    lines = itemIds.map((itemId) => ({ itemId, systemQty: onHand.get(itemId) ?? 0 }));
  } else {
    const rows = await prisma.storeStock.findMany({
      where: { storeId: input.storeId, item: { deletedAt: null } },
      select: { itemId: true, quantity: true },
    });
    lines = rows.map((r) => ({ itemId: r.itemId, systemQty: r.quantity }));
  }

  if (!lines.length) {
    throw Errors.validation(
      `${store.name} holds no stock to count — receive stock into it, or name the items to count explicitly`
    );
  }

  const created = await withUniqueRetry(() => prisma.$transaction(async (tx) => {
    const code = await nextDocumentCode("STK", (startsWith) =>
      tx.stockTake.count({ where: { code: { startsWith } } })
    );
    return tx.stockTake.create({
      data: {
        code,
        storeId: input.storeId,
        conductedById: input.conductedById,
        status: "DRAFT",
        notes: input.notes ?? null,
        items: { create: lines.map((l) => ({ itemId: l.itemId, systemQty: l.systemQty })) },
      },
    });
  }));

  await recordAudit({
    ctx: auditCtx,
    action: "STOCKTAKE_CREATED", module: "stocktakes", entity: "stocktake", entityId: created.id,
    newValue: { code: created.code, storeId: input.storeId, itemCount: lines.length },
    description: `Opened stock take ${created.code} for ${store.name} over ${lines.length} item(s)`,
  });

  return getStockTake(created.id);
}

/** Records physical counts. Repeatable — a line may be recounted until completion. */
export async function recordCounts(
  id: string,
  input: { counts: Array<{ itemId: string; physicalQty: number; remarks?: string }> },
  auditCtx?: AuditContext
) {
  const take = await prisma.stockTake.findUnique({ where: { id }, include: { items: true, store: true } });
  if (!take) throw Errors.notFound("Stock take", id);
  if (!["DRAFT", "IN_PROGRESS"].includes(take.status)) {
    throw Errors.invalidStockTake(
      `Stock take ${take.code} is ${take.status.toLowerCase()} — counts can only be entered while it is open`
    );
  }
  if (!input.counts.length) throw Errors.validation("No counts supplied");

  const byItem = new Map(take.items.map((i) => [i.itemId, i]));
  const seen = new Set<string>();
  for (const c of input.counts) {
    if (!byItem.has(c.itemId)) {
      throw Errors.validation(`Item ${c.itemId} is not part of stock take ${take.code}`);
    }
    if (seen.has(c.itemId)) throw Errors.validation(`Item ${c.itemId} was counted twice in one request`);
    seen.add(c.itemId);
    if (!Number.isFinite(c.physicalQty) || c.physicalQty < 0) {
      throw Errors.validation(`Physical quantity for item ${c.itemId} cannot be negative`);
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const c of input.counts) {
      const line = byItem.get(c.itemId)!;
      await tx.stockTakeItem.update({
        where: { id: line.id },
        data: {
          physicalQty: c.physicalQty,
          variance: c.physicalQty - line.systemQty,
          remarks: c.remarks ?? line.remarks,
        },
      });
    }
    if (take.status === "DRAFT") {
      await tx.stockTake.update({ where: { id: take.id }, data: { status: "IN_PROGRESS" } });
    }
  });

  await recordAudit({
    ctx: auditCtx,
    action: "STOCKTAKE_COUNTED", module: "stocktakes", entity: "stocktake", entityId: take.id,
    newValue: { code: take.code, lines: input.counts.length },
    description: `Recorded ${input.counts.length} count(s) on stock take ${take.code}`,
  });

  return getStockTake(take.id);
}

export async function completeStockTake(id: string, auditCtx?: AuditContext) {
  const take = await prisma.stockTake.findUnique({ where: { id }, include: { items: true } });
  if (!take) throw Errors.notFound("Stock take", id);
  if (take.status !== "IN_PROGRESS") {
    throw Errors.invalidStockTake(
      take.status === "DRAFT"
        ? `Stock take ${take.code} has no counts recorded yet`
        : `Stock take ${take.code} is already ${take.status.toLowerCase()}`
    );
  }

  const uncounted = take.items.filter((i) => i.physicalQty === null);
  if (uncounted.length) {
    throw Errors.invalidStockTake(
      `${uncounted.length} of ${take.items.length} item(s) on ${take.code} have not been counted yet`
    );
  }

  await prisma.stockTake.update({
    where: { id: take.id },
    data: { status: "COMPLETED", endDate: new Date() },
  });

  await recordAudit({
    ctx: auditCtx,
    action: "STOCKTAKE_COMPLETED", module: "stocktakes", entity: "stocktake", entityId: take.id,
    oldValue: { status: "IN_PROGRESS" }, newValue: { status: "COMPLETED" },
    description: `Completed stock take ${take.code}`,
  });

  return getStockTake(take.id);
}

/**
 * Applies the counted variance to real stock, atomically.
 *
 * The physical count is treated as the truth: StoreStock is set *to* physicalQty
 * rather than adjusted by the variance, which is the whole point of counting.
 * FIFO follows along — a surplus opens a new layer at current average cost, a
 * shortage consumes the oldest layers first.
 */
export async function reconcileStockTake(id: string, reconciledById: string, auditCtx?: AuditContext) {
  const take = await prisma.stockTake.findUnique({ where: { id }, include: { items: true, store: true } });
  if (!take) throw Errors.notFound("Stock take", id);
  if (take.status !== "COMPLETED") {
    throw Errors.invalidStockTake(
      take.status === "RECONCILED"
        ? `Stock take ${take.code} has already been reconciled`
        : `Only a completed stock take can be reconciled — ${take.code} is ${take.status.toLowerCase()}`
    );
  }
  // A separate stocktake.approve permission exists precisely so that the person
  // who walked the shelves is not the person who signs off the correction.
  if (take.conductedById === reconciledById) {
    throw Errors.forbidden("You cannot reconcile a stock take you conducted yourself");
  }

  const adjustments = take.items.filter((i) => (i.variance ?? 0) !== 0);

  const applied: Array<{ itemId: string; variance: number; unitCost: number; clampedBy?: number }> = [];

  await prisma.$transaction(async (tx) => {
    for (const line of adjustments) {
      const variance = line.variance!;
      const physicalQty = line.physicalQty!;

      const existing = await tx.storeStock.findUnique({
        where: { itemId_storeId: { itemId: line.itemId, storeId: take.storeId } },
      });
      const balanceBefore = existing?.quantity ?? 0;

      let unitCost = 0;
      let clampedBy: number | undefined;

      if (variance > 0) {
        // Found stock has no receipt behind it, so the layer carries a null
        // receiptId. Cost it at what this store currently holds the item at,
        // falling back to the item's organisation-wide average.
        const layers = await tx.fifoLayer.findMany({
          where: { itemId: line.itemId, storeId: take.storeId, remainingQty: { gt: 0 } },
          select: { remainingQty: true, unitCost: true },
        });
        const qty = layers.reduce((t, l) => t + l.remainingQty, 0);
        const val = layers.reduce((t, l) => t + l.remainingQty * l.unitCost, 0);
        if (qty > 0) {
          unitCost = val / qty;
        } else {
          const item = await tx.inventoryItem.findUniqueOrThrow({
            where: { id: line.itemId }, select: { unitCost: true },
          });
          unitCost = item.unitCost;
        }

        await tx.fifoLayer.create({
          data: {
            itemId: line.itemId, storeId: take.storeId, receiptId: null,
            originalQty: variance, remainingQty: variance, unitCost,
          },
        });
      } else {
        const shortfall = -variance;
        // If the layers already held less than StoreStock claimed, that drift
        // predates this count. Consume what is actually there rather than
        // refusing to reconcile — leaving the books knowingly wrong would be a
        // worse outcome than an imperfect correction. The clamp is audited.
        const availableLayers = await tx.fifoLayer.aggregate({
          where: { itemId: line.itemId, storeId: take.storeId, remainingQty: { gt: 0 } },
          _sum: { remainingQty: true },
        });
        const available = availableLayers._sum.remainingQty ?? 0;
        const consume = Math.min(shortfall, available);
        if (consume < shortfall) clampedBy = shortfall - consume;

        if (consume > 0) {
          const { avgUnitCost } = await consumeFifoTx(tx, {
            itemId: line.itemId, storeId: take.storeId, quantity: consume,
          });
          unitCost = avgUnitCost;
        }
      }

      if (existing) {
        await tx.storeStock.update({ where: { id: existing.id }, data: { quantity: physicalQty } });
      } else {
        await tx.storeStock.create({
          data: { itemId: line.itemId, storeId: take.storeId, quantity: physicalQty },
        });
      }

      const txnCode = await nextTxnCode(tx);
      await tx.stockTransaction.create({
        data: {
          code: txnCode, itemId: line.itemId, storeId: take.storeId,
          type: variance > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
          quantity: variance, unitCost,
          balanceBefore, balanceAfter: physicalQty,
          referenceType: "STOCKTAKE", referenceId: take.id, userId: reconciledById,
          remarks: `Stock take ${take.code} — counted ${physicalQty}, system said ${line.systemQty}`,
        },
      });

      await refreshItemStatus(tx, line.itemId);
      applied.push({ itemId: line.itemId, variance, unitCost, clampedBy });
    }

    await tx.stockTake.update({ where: { id: take.id }, data: { status: "RECONCILED" } });
  });

  await recordAudit({
    ctx: auditCtx,
    action: "STOCKTAKE_RECONCILED", module: "stocktakes", entity: "stocktake", entityId: take.id,
    oldValue: { status: "COMPLETED" },
    newValue: {
      status: "RECONCILED", code: take.code, storeId: take.storeId,
      adjustedLines: applied.length,
      surplusQty: applied.reduce((t, a) => t + Math.max(0, a.variance), 0),
      shortageQty: applied.reduce((t, a) => t + Math.max(0, -a.variance), 0),
      clamped: applied.filter((a) => a.clampedBy).map((a) => ({ itemId: a.itemId, by: a.clampedBy })),
    },
    description: `Reconciled stock take ${take.code} — ${applied.length} adjustment(s) applied`,
  });

  return getStockTake(take.id);
}

/** Only an unreconciled count can be discarded — nothing has touched stock yet. */
export async function deleteStockTake(id: string, auditCtx?: AuditContext) {
  const take = await prisma.stockTake.findUnique({ where: { id } });
  if (!take) throw Errors.notFound("Stock take", id);
  if (!["DRAFT", "IN_PROGRESS"].includes(take.status)) {
    throw Errors.invalidStockTake(
      `Stock take ${take.code} is ${take.status.toLowerCase()} and is part of the audit trail — it cannot be deleted`
    );
  }

  await prisma.stockTake.delete({ where: { id } });

  await recordAudit({
    ctx: auditCtx,
    action: "STOCKTAKE_DELETED", module: "stocktakes", entity: "stocktake", entityId: id,
    oldValue: { code: take.code, storeId: take.storeId, status: take.status },
    description: `Deleted stock take ${take.code} before reconciliation`,
  });

  return { id, code: take.code };
}
