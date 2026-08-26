import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { recordAudit, AuditContext } from "./audit";
import { consumeFifoTx, nextTxnCode } from "./fifo-consume";
import { refreshItemStatus } from "./item-status";
import { nextDocumentCode, withUniqueRetry } from "../utils/document-code";
import { applyRequisitionFulfilment } from "./requisition-fulfilment";

export async function listIssues(params: { page: number; limit: number; search?: string; storeId?: string; status?: string }) {
  const where: Prisma.StockIssueWhereInput = {};
  if (params.search) where.code = { contains: params.search };
  if (params.storeId) where.sourceStoreId = params.storeId;
  if (params.status) where.status = params.status as any;

  const [total, rows] = await Promise.all([
    prisma.stockIssue.count({ where }),
    prisma.stockIssue.findMany({
      where, orderBy: { issueDate: "desc" },
      skip: (params.page - 1) * params.limit, take: params.limit,
      include: { sourceStore: true, destStore: true, issuedBy: true, _count: { select: { items: true } } },
    }),
  ]);

  return { total, items: rows.map((i) => ({
    id: i.id, code: i.code,
    sourceStore: { id: i.sourceStore.id, code: i.sourceStore.code, name: i.sourceStore.name },
    destStore: i.destStore ? { id: i.destStore.id, code: i.destStore.code, name: i.destStore.name } : null,
    issuedBy: { id: i.issuedBy.id, fullName: i.issuedBy.fullName },
    department: i.department, status: i.status, totalQuantity: i.totalQuantity, totalCogs: i.totalCogs,
    itemCount: i._count.items, issueDate: i.issueDate.toISOString(), notes: i.notes,
  })) };
}

export async function getIssue(id: string) {
  const i = await prisma.stockIssue.findUnique({
    where: { id },
    include: { sourceStore: true, destStore: true, issuedBy: true, items: { include: { item: { include: { uom: true } } } }, gatePass: true },
  });
  if (!i) throw Errors.notFound("Issue", id);
  return {
    id: i.id, code: i.code, sourceStore: i.sourceStore, destStore: i.destStore,
    issuedBy: { id: i.issuedBy.id, fullName: i.issuedBy.fullName },
    department: i.department, status: i.status, totalQuantity: i.totalQuantity, totalCogs: i.totalCogs,
    issueDate: i.issueDate.toISOString(), notes: i.notes,
    items: i.items.map((it) => ({
      id: it.id, itemId: it.item.id, itemCode: it.item.code, itemName: it.item.name, uom: it.item.uom.code,
      quantity: it.quantity, unitCost: it.unitCost, cogs: it.cogs, remarks: it.remarks,
    })),
    gatePass: i.gatePass ? { id: i.gatePass.id, code: i.gatePass.code, status: i.gatePass.status } : null,
  };
}

export async function createIssue(input: any, auditCtx?: AuditContext) {
  if (!input.items.length) throw Errors.validation("Issue must have at least one item");
  for (const it of input.items) {
    if (it.quantity <= 0) throw Errors.validation(`Quantity must be positive for item ${it.itemId}`);
  }

  const totalQuantity = input.items.reduce((s: number, i: any) => s + i.quantity, 0);
  let totalCogs = 0;

  // Code generated inside the transaction, whole operation retried on a unique
  // clash — two concurrent issues can no longer share an ISS number.
  const { issue, fulfilled } = await withUniqueRetry(() => prisma.$transaction(async (tx) => {
    totalCogs = 0;
    const code = await nextDocumentCode("ISS", (startsWith) =>
      tx.stockIssue.count({ where: { code: { startsWith } } })
    );

    const iss = await tx.stockIssue.create({
      data: {
        code, sourceStoreId: input.sourceStoreId, destStoreId: input.destStoreId ?? null,
        issuedById: input.issuedById, department: input.department, requisitionId: input.requisitionId ?? null,
        status: "COMPLETED", notes: input.notes ?? null, totalQuantity, totalCogs: 0,
        items: { create: input.items.map((it: any) => ({
          item: { connect: { id: it.itemId } }, quantity: it.quantity, unitCost: 0, cogs: 0, remarks: it.remarks ?? null,
        })) },
      },
      include: { items: true },
    });

    for (const ii of iss.items) {
      const { totalCogs: cogs, avgUnitCost } = await consumeFifoTx(tx, { itemId: ii.itemId, storeId: input.sourceStoreId, quantity: ii.quantity });

      const existing = await tx.storeStock.findUnique({ where: { itemId_storeId: { itemId: ii.itemId, storeId: input.sourceStoreId } } });
      if (!existing) throw Errors.insufficientStock(ii.itemId, ii.quantity, 0);
      const balanceBefore = existing.quantity;
      const balanceAfter = balanceBefore - ii.quantity;
      if (balanceAfter < 0) throw Errors.insufficientStock(ii.itemId, ii.quantity, balanceBefore);
      await tx.storeStock.update({ where: { id: existing.id }, data: { quantity: balanceAfter } });

      await tx.stockIssueItem.update({ where: { id: ii.id }, data: { unitCost: avgUnitCost, cogs } });

      const txnCode = await nextTxnCode(tx);
      await tx.stockTransaction.create({
        data: {
          code: txnCode, itemId: ii.itemId, storeId: input.sourceStoreId, type: "ISSUE",
          quantity: -ii.quantity, unitCost: avgUnitCost, balanceBefore, balanceAfter,
          referenceType: "ISSUE", referenceId: iss.id, userId: input.issuedById, remarks: `Issue ${code} — ${input.department}`,
        },
      });

      await refreshItemStatus(tx, ii.itemId);

      totalCogs += cogs;
    }

    // Fulfilment is applied inside the same transaction, so an over-issue or a
    // requisition in the wrong state rolls the entire issue back.
    const fulfilled = input.requisitionId
      ? await applyRequisitionFulfilment(
        tx,
        input.requisitionId,
        iss.items.map((ii) => ({ itemId: ii.itemId, quantity: ii.quantity }))
      )
      : null;

    const updated = await tx.stockIssue.update({ where: { id: iss.id }, data: { totalCogs } });
    return { issue: updated, fulfilled };
  }));

  await recordAudit({
    ctx: auditCtx,
    action: "STOCK_ISSUED", module: "issues", entity: "issue", entityId: issue.id,
    newValue: {
      code: issue.code, sourceStoreId: input.sourceStoreId, department: input.department,
      totalQuantity, totalCogs, itemCount: input.items.length,
      requisition: fulfilled ? { code: fulfilled.code, status: fulfilled.status } : null,
    },
  });

  return getIssue(issue.id);
}
