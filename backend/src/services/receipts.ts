import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { recordAudit } from "./audit";
import { nextTxnCode } from "./fifo-consume";
import { refreshItemStatus } from "./item-status";

export async function listReceipts(params: { page: number; limit: number; search?: string; supplierId?: string; storeId?: string; status?: string }) {
  const where: Prisma.StockReceiptWhereInput = {};
  if (params.search) where.code = { contains: params.search };
  if (params.supplierId) where.supplierId = params.supplierId;
  if (params.storeId) where.storeId = params.storeId;
  if (params.status) where.status = params.status as any;

  const [total, rows] = await Promise.all([
    prisma.stockReceipt.count({ where }),
    prisma.stockReceipt.findMany({
      where, orderBy: { receiptDate: "desc" },
      skip: (params.page - 1) * params.limit, take: params.limit,
      include: { supplier: true, store: true, receivedBy: true, _count: { select: { items: true } } },
    }),
  ]);

  return { total, items: rows.map((r) => ({
    id: r.id, code: r.code,
    supplier: { id: r.supplier.id, code: r.supplier.code, name: r.supplier.name },
    store: { id: r.store.id, code: r.store.code, name: r.store.name },
    receivedBy: { id: r.receivedBy.id, fullName: r.receivedBy.fullName },
    status: r.status, totalAmount: r.totalAmount, totalQuantity: r.totalQuantity,
    itemCount: r._count.items, receiptDate: r.receiptDate.toISOString(), inspectionNotes: r.inspectionNotes,
  })) };
}

export async function getReceipt(id: string) {
  const r = await prisma.stockReceipt.findUnique({
    where: { id },
    include: { supplier: true, store: true, receivedBy: true, items: { include: { item: { include: { uom: true } } } }, fifoLayers: true },
  });
  if (!r) throw Errors.notFound("Receipt", id);
  return {
    id: r.id, code: r.code, supplier: r.supplier, store: r.store,
    receivedBy: { id: r.receivedBy.id, fullName: r.receivedBy.fullName },
    status: r.status, totalAmount: r.totalAmount, totalQuantity: r.totalQuantity,
    inspectionNotes: r.inspectionNotes, receiptDate: r.receiptDate.toISOString(), createdAt: r.createdAt.toISOString(),
    items: r.items.map((ri) => ({
      id: ri.id, itemId: ri.item.id, itemCode: ri.item.code, itemName: ri.item.name, uom: ri.item.uom.code,
      quantity: ri.quantity, unitCost: ri.unitCost, total: ri.quantity * ri.unitCost,
      inspected: ri.inspected, inspectionPassed: ri.inspectionPassed, remarks: ri.remarks,
    })),
    fifoLayers: r.fifoLayers.map((l) => ({ id: l.id, originalQty: l.originalQty, remainingQty: l.remainingQty, unitCost: l.unitCost })),
  };
}

export async function createReceipt(input: any, auditCtx?: { userId?: string; ip?: string }) {
  if (!input.items.length) throw Errors.validation("Receipt must have at least one item");
  for (const it of input.items) {
    if (it.quantity <= 0) throw Errors.validation(`Quantity must be positive for item ${it.itemId}`);
    if (it.unitCost < 0) throw Errors.validation(`Unit cost cannot be negative for item ${it.itemId}`);
  }

  const today = new Date();
  const ymd = `${today.getUTCFullYear()}${String(today.getUTCMonth() + 1).padStart(2, "0")}${String(today.getUTCDate()).padStart(2, "0")}`;
  const code = `GRN-${ymd}-${String(await prisma.stockReceipt.count({ where: { code: { startsWith: `GRN-${ymd}-` } } }) + 1).padStart(4, "0")}`;
  const totalQuantity = input.items.reduce((s: number, i: any) => s + i.quantity, 0);
  const totalAmount = input.items.reduce((s: number, i: any) => s + i.quantity * i.unitCost, 0);

  const receipt = await prisma.$transaction(async (tx) => {
    const r = await tx.stockReceipt.create({
      data: {
        code, supplierId: input.supplierId, storeId: input.storeId, receivedById: input.receivedById,
        status: "CONFIRMED", inspectionNotes: input.inspectionNotes ?? null, totalQuantity, totalAmount,
        items: { create: input.items.map((it: any) => ({
          itemId: it.itemId, quantity: it.quantity, unitCost: it.unitCost,
          inspected: it.inspected ?? true, inspectionPassed: it.inspectionPassed ?? true, remarks: it.remarks ?? null,
        })) },
      },
      include: { items: true },
    });

    for (const ri of r.items) {
      const existing = await tx.storeStock.findUnique({ where: { itemId_storeId: { itemId: ri.itemId, storeId: input.storeId } } });
      const balanceBefore = existing?.quantity ?? 0;
      const balanceAfter = balanceBefore + ri.quantity;
      if (existing) {
        await tx.storeStock.update({ where: { id: existing.id }, data: { quantity: balanceAfter } });
      } else {
        await tx.storeStock.create({ data: { itemId: ri.itemId, storeId: input.storeId, quantity: balanceAfter } });
      }

      await tx.fifoLayer.create({
        data: { itemId: ri.itemId, storeId: input.storeId, receiptId: r.id, originalQty: ri.quantity, remainingQty: ri.quantity, unitCost: ri.unitCost },
      });

      const txnCode = await nextTxnCode(tx);
      await tx.stockTransaction.create({
        data: {
          code: txnCode, itemId: ri.itemId, storeId: input.storeId, type: "RECEIPT",
          quantity: ri.quantity, unitCost: ri.unitCost, balanceBefore, balanceAfter,
          referenceType: "RECEIPT", referenceId: r.id, userId: input.receivedById, remarks: `Receipt ${code}`,
        },
      });

      const layers = await tx.fifoLayer.findMany({ where: { itemId: ri.itemId, remainingQty: { gt: 0 } } });
      const totalQty = layers.reduce((s, l) => s + l.remainingQty, 0);
      const totalVal = layers.reduce((s, l) => s + l.remainingQty * l.unitCost, 0);
      const avgCost = totalQty > 0 ? totalVal / totalQty : ri.unitCost;
      await tx.inventoryItem.update({ where: { id: ri.itemId }, data: { unitCost: avgCost } });

      await refreshItemStatus(tx, ri.itemId);
    }
    return r;
  });

  await recordAudit({
    ctx: { userId: auditCtx?.userId, ipAddress: auditCtx?.ip },
    action: "STOCK_RECEIVED", module: "receipts", entity: "receipt", entityId: receipt.id,
    newValue: { code, supplierId: input.supplierId, storeId: input.storeId, totalQuantity, totalAmount, itemCount: input.items.length },
  });

  return getReceipt(receipt.id);
}
