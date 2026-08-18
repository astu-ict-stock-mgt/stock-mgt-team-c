import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { recordAudit } from "./audit";
import { consumeFifoTx, nextTxnCode } from "./fifo-consume";

export async function listTransfers(params: { page: number; limit: number; search?: string; fromWarehouseId?: string; toWarehouseId?: string; status?: string }) {
  const where: Prisma.StockTransferWhereInput = {};
  if (params.search) where.code = { contains: params.search };
  if (params.fromWarehouseId) where.fromWarehouseId = params.fromWarehouseId;
  if (params.toWarehouseId) where.toWarehouseId = params.toWarehouseId;
  if (params.status) where.status = params.status as any;

  const [total, rows] = await Promise.all([
    prisma.stockTransfer.count({ where }),
    prisma.stockTransfer.findMany({
      where, orderBy: { transferDate: "desc" },
      skip: (params.page - 1) * params.limit, take: params.limit,
      include: { fromWarehouse: true, toWarehouse: true, transferredBy: true, _count: { select: { items: true } } },
    }),
  ]);

  return { total, items: rows.map((t) => ({
    id: t.id, code: t.code,
    fromWarehouse: { id: t.fromWarehouse.id, code: t.fromWarehouse.code, name: t.fromWarehouse.name },
    toWarehouse: { id: t.toWarehouse.id, code: t.toWarehouse.code, name: t.toWarehouse.name },
    transferredBy: { id: t.transferredBy.id, fullName: t.transferredBy.fullName },
    status: t.status, totalQuantity: t.totalQuantity, transferDate: t.transferDate.toISOString(),
    notes: t.notes, itemCount: t._count.items,
  })) };
}

export async function getTransfer(id: string) {
  const t = await prisma.stockTransfer.findUnique({
    where: { id },
    include: { fromWarehouse: true, toWarehouse: true, transferredBy: true, items: { include: { item: { include: { uom: true } } } } },
  });
  if (!t) throw Errors.notFound("Transfer", id);
  return {
    id: t.id, code: t.code, fromWarehouse: t.fromWarehouse, toWarehouse: t.toWarehouse,
    transferredBy: { id: t.transferredBy.id, fullName: t.transferredBy.fullName },
    status: t.status, totalQuantity: t.totalQuantity, transferDate: t.transferDate.toISOString(), notes: t.notes,
    items: t.items.map((it) => ({
      id: it.id, itemId: it.item.id, itemCode: it.item.code, itemName: it.item.name, uom: it.item.uom.code,
      quantity: it.quantity, unitCost: it.unitCost,
    })),
  };
}

export async function createTransfer(input: any, auditCtx?: { userId?: string; ip?: string }) {
  if (input.fromWarehouseId === input.toWarehouseId) throw Errors.invalidStockTransfer("Source and destination warehouses must be different");
  if (!input.items.length) throw Errors.validation("Transfer must have at least one item");
  for (const it of input.items) {
    if (it.quantity <= 0) throw Errors.validation(`Quantity must be positive for item ${it.itemId}`);
  }

  const today = new Date();
  const ymd = `${today.getUTCFullYear()}${String(today.getUTCMonth() + 1).padStart(2, "0")}${String(today.getUTCDate()).padStart(2, "0")}`;
  const code = `TRF-${ymd}-${String(await prisma.stockTransfer.count({ where: { code: { startsWith: `TRF-${ymd}-` } } }) + 1).padStart(4, "0")}`;
  const totalQuantity = input.items.reduce((s: number, i: any) => s + i.quantity, 0);

  const transfer = await prisma.$transaction(async (tx) => {
    const tr = await tx.stockTransfer.create({
      data: {
        code, fromWarehouseId: input.fromWarehouseId, toWarehouseId: input.toWarehouseId,
        transferredById: input.transferredById, status: "COMPLETED", notes: input.notes ?? null,
        totalQuantity,
        items: { create: input.items.map((it: any) => ({
          item: { connect: { id: it.itemId } }, quantity: it.quantity, unitCost: 0,
        })) },
      },
      include: { items: true },
    });

    for (const ti of tr.items) {
      // Consume from source warehouse (atomic)
      const { avgUnitCost, consumptions } = await consumeFifoTx(tx, {
        itemId: ti.itemId, warehouseId: input.fromWarehouseId, quantity: ti.quantity,
      });

      // Update source stock
      const srcStock = await tx.warehouseStock.findUnique({ where: { itemId_warehouseId: { itemId: ti.itemId, warehouseId: input.fromWarehouseId } } });
      if (!srcStock) throw Errors.insufficientStock(ti.itemId, ti.quantity, 0);
      await tx.warehouseStock.update({ where: { id: srcStock.id }, data: { quantity: srcStock.quantity - ti.quantity } });

      // Create new FIFO layer at destination preserving the original cost
      for (const c of consumptions) {
        await tx.fifoLayer.create({
          data: {
            itemId: ti.itemId, warehouseId: input.toWarehouseId, receiptId: c.layerId,
            originalQty: c.quantity, remainingQty: c.quantity, unitCost: c.unitCost,
          },
        });
      }

      // Update dest warehouse stock
      const destStock = await tx.warehouseStock.findUnique({ where: { itemId_warehouseId: { itemId: ti.itemId, warehouseId: input.toWarehouseId } } });
      if (destStock) {
        await tx.warehouseStock.update({ where: { id: destStock.id }, data: { quantity: destStock.quantity + ti.quantity } });
      } else {
        await tx.warehouseStock.create({ data: { itemId: ti.itemId, warehouseId: input.toWarehouseId, quantity: ti.quantity } });
      }

      // Update transfer item cost
      await tx.stockTransferItem.update({ where: { id: ti.id }, data: { unitCost: avgUnitCost } });

      // Create TRANSFER_OUT + TRANSFER_IN transactions
      const txnCode1 = await nextTxnCode(tx);
      await tx.stockTransaction.create({
        data: {
          code: txnCode1, itemId: ti.itemId, warehouseId: input.fromWarehouseId, type: "TRANSFER_OUT",
          quantity: -ti.quantity, unitCost: avgUnitCost, balanceBefore: srcStock.quantity,
          balanceAfter: srcStock.quantity - ti.quantity,
          referenceType: "TRANSFER", referenceId: tr.id, userId: input.transferredById, remarks: `Transfer ${code} out`,
        },
      });
      const txnCode2 = await nextTxnCode(tx);
      await tx.stockTransaction.create({
        data: {
          code: txnCode2, itemId: ti.itemId, warehouseId: input.toWarehouseId, type: "TRANSFER_IN",
          quantity: ti.quantity, unitCost: avgUnitCost, balanceBefore: destStock?.quantity ?? 0,
          balanceAfter: (destStock?.quantity ?? 0) + ti.quantity,
          referenceType: "TRANSFER", referenceId: tr.id, userId: input.transferredById, remarks: `Transfer ${code} in`,
        },
      });
    }

    return tr;
  });

  await recordAudit({
    ctx: { userId: auditCtx?.userId, ipAddress: auditCtx?.ip },
    action: "STOCK_TRANSFERRED", module: "transfers", entity: "transfer", entityId: transfer.id,
    newValue: { code, fromWarehouseId: input.fromWarehouseId, toWarehouseId: input.toWarehouseId, totalQuantity, itemCount: input.items.length },
  });

  return getTransfer(transfer.id);
}
