import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { recordAudit } from "./audit";
import { nextTxnCode } from "./fifo-consume";

export async function listReceipts(params: { page: number; limit: number; search?: string; supplierId?: string; warehouseId?: string; status?: string }) {
  const where: Prisma.StockReceiptWhereInput = {};
  if (params.search) where.code = { contains: params.search };
  if (params.supplierId) where.supplierId = params.supplierId;
  if (params.warehouseId) where.warehouseId = params.warehouseId;
  if (params.status) where.status = params.status as any;

  const [total, rows] = await Promise.all([
    prisma.stockReceipt.count({ where }),
    prisma.stockReceipt.findMany({
      where, orderBy: { receiptDate: "desc" },
      skip: (params.page - 1) * params.limit, take: params.limit,
      include: { supplier: true, warehouse: true, receivedBy: true, _count: { select: { items: true } } },
    }),
  ]);

  return { total, items: rows.map((r) => ({
    id: r.id, code: r.code,
    supplier: { id: r.supplier.id, code: r.supplier.code, name: r.supplier.name },
    warehouse: { id: r.warehouse.id, code: r.warehouse.code, name: r.warehouse.name },
    receivedBy: { id: r.receivedBy.id, fullName: r.receivedBy.fullName },
    status: r.status, totalAmount: r.totalAmount, totalQuantity: r.totalQuantity,
    itemCount: r._count.items, receiptDate: r.receiptDate.toISOString(), inspectionNotes: r.inspectionNotes,
  })) };
}

export async function getReceipt(id: string) {
  const r = await prisma.stockReceipt.findUnique({
    where: { id },
    include: { supplier: true, warehouse: true, receivedBy: true, items: { include: { item: { include: { uom: true } } } }, fifoLayers: true },
  });
  if (!r) throw Errors.notFound("Receipt", id);
  return {
    id: r.id, code: r.code, supplier: r.supplier, warehouse: r.warehouse,
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
        code, supplierId: input.supplierId, warehouseId: input.warehouseId, receivedById: input.receivedById,
        status: "CONFIRMED", inspectionNotes: input.inspectionNotes ?? null, totalQuantity, totalAmount,
        items: { create: input.items.map((it: any) => ({
          itemId: it.itemId, quantity: it.quantity, unitCost: it.unitCost,
          inspected: it.inspected ?? true, inspectionPassed: it.inspectionPassed ?? true, remarks: it.remarks ?? null,
        })) },
      },
      include: { items: true },
    });

    for (const ri of r.items) {
      const existing = await tx.warehouseStock.findUnique({ where: { itemId_warehouseId: { itemId: ri.itemId, warehouseId: input.warehouseId } } });
      const balanceBefore = existing?.quantity ?? 0;
      const balanceAfter = balanceBefore + ri.quantity;
      if (existing) {
        await tx.warehouseStock.update({ where: { id: existing.id }, data: { quantity: balanceAfter } });
      } else {
        await tx.warehouseStock.create({ data: { itemId: ri.itemId, warehouseId: input.warehouseId, quantity: balanceAfter } });
      }

      await tx.fifoLayer.create({
        data: { itemId: ri.itemId, warehouseId: input.warehouseId, receiptId: r.id, originalQty: ri.quantity, remainingQty: ri.quantity, unitCost: ri.unitCost },
      });

      const txnCode = await nextTxnCode(tx);
      await tx.stockTransaction.create({
        data: {
          code: txnCode, itemId: ri.itemId, warehouseId: input.warehouseId, type: "RECEIPT",
          quantity: ri.quantity, unitCost: ri.unitCost, balanceBefore, balanceAfter,
          referenceType: "RECEIPT", referenceId: r.id, userId: input.receivedById, remarks: `Receipt ${code}`,
        },
      });

      const layers = await tx.fifoLayer.findMany({ where: { itemId: ri.itemId, remainingQty: { gt: 0 } } });
      const totalQty = layers.reduce((s, l) => s + l.remainingQty, 0);
      const totalVal = layers.reduce((s, l) => s + l.remainingQty * l.unitCost, 0);
      const avgCost = totalQty > 0 ? totalVal / totalQty : ri.unitCost;
      await tx.inventoryItem.update({ where: { id: ri.itemId }, data: { unitCost: avgCost } });
    }
    return r;
  });

  await recordAudit({
    ctx: { userId: auditCtx?.userId, ipAddress: auditCtx?.ip },
    action: "STOCK_RECEIVED", module: "receipts", entity: "receipt", entityId: receipt.id,
    newValue: { code, supplierId: input.supplierId, warehouseId: input.warehouseId, totalQuantity, totalAmount, itemCount: input.items.length },
  });

  return getReceipt(receipt.id);
}
