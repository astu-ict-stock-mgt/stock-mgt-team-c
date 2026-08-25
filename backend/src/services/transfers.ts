import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { recordAudit } from "./audit";
import { consumeFifoTx, nextTxnCode } from "./fifo-consume";
import { refreshItemStatus } from "./item-status";

export async function listTransfers(params: { page: number; limit: number; search?: string; fromStoreId?: string; toStoreId?: string; status?: string }) {
  const where: Prisma.StockTransferWhereInput = {};
  if (params.search) where.code = { contains: params.search };
  if (params.fromStoreId) where.fromStoreId = params.fromStoreId;
  if (params.toStoreId) where.toStoreId = params.toStoreId;
  if (params.status) where.status = params.status as any;

  const [total, rows] = await Promise.all([
    prisma.stockTransfer.count({ where }),
    prisma.stockTransfer.findMany({
      where, orderBy: { transferDate: "desc" },
      skip: (params.page - 1) * params.limit, take: params.limit,
      include: { fromStore: true, toStore: true, transferredBy: true, _count: { select: { items: true } } },
    }),
  ]);

  return { total, items: rows.map((t) => ({
    id: t.id, code: t.code,
    fromStore: { id: t.fromStore.id, code: t.fromStore.code, name: t.fromStore.name },
    toStore: { id: t.toStore.id, code: t.toStore.code, name: t.toStore.name },
    transferredBy: { id: t.transferredBy.id, fullName: t.transferredBy.fullName },
    status: t.status, totalQuantity: t.totalQuantity, transferDate: t.transferDate.toISOString(),
    notes: t.notes, itemCount: t._count.items,
  })) };
}

export async function getTransfer(id: string) {
  const t = await prisma.stockTransfer.findUnique({
    where: { id },
    include: { fromStore: true, toStore: true, transferredBy: true, items: { include: { item: { include: { uom: true } } } } },
  });
  if (!t) throw Errors.notFound("Transfer", id);
  return {
    id: t.id, code: t.code, fromStore: t.fromStore, toStore: t.toStore,
    transferredBy: { id: t.transferredBy.id, fullName: t.transferredBy.fullName },
    status: t.status, totalQuantity: t.totalQuantity, transferDate: t.transferDate.toISOString(), notes: t.notes,
    items: t.items.map((it) => ({
      id: it.id, itemId: it.item.id, itemCode: it.item.code, itemName: it.item.name, uom: it.item.uom.code,
      quantity: it.quantity, unitCost: it.unitCost,
    })),
  };
}

export async function createTransfer(input: any, auditCtx?: { userId?: string; ip?: string }) {
  if (input.fromStoreId === input.toStoreId) throw Errors.invalidStockTransfer("Source and destination stores must be different");
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
        code, fromStoreId: input.fromStoreId, toStoreId: input.toStoreId,
        transferredById: input.transferredById, status: "COMPLETED", notes: input.notes ?? null,
        totalQuantity,
        items: { create: input.items.map((it: any) => ({
          item: { connect: { id: it.itemId } }, quantity: it.quantity, unitCost: 0,
        })) },
      },
      include: { items: true },
    });

    for (const ti of tr.items) {
      // Consume from source store (atomic)
      const { avgUnitCost, consumptions } = await consumeFifoTx(tx, {
        itemId: ti.itemId, storeId: input.fromStoreId, quantity: ti.quantity,
      });

      // Update source stock
      const srcStock = await tx.storeStock.findUnique({ where: { itemId_storeId: { itemId: ti.itemId, storeId: input.fromStoreId } } });
      if (!srcStock) throw Errors.insufficientStock(ti.itemId, ti.quantity, 0);
      await tx.storeStock.update({ where: { id: srcStock.id }, data: { quantity: srcStock.quantity - ti.quantity } });

      // Create new FIFO layer at destination preserving the original cost
      for (const c of consumptions) {
        await tx.fifoLayer.create({
          data: {
            itemId: ti.itemId, storeId: input.toStoreId, receiptId: c.layerId,
            originalQty: c.quantity, remainingQty: c.quantity, unitCost: c.unitCost,
          },
        });
      }

      // Update dest store stock
      const destStock = await tx.storeStock.findUnique({ where: { itemId_storeId: { itemId: ti.itemId, storeId: input.toStoreId } } });
      if (destStock) {
        await tx.storeStock.update({ where: { id: destStock.id }, data: { quantity: destStock.quantity + ti.quantity } });
      } else {
        await tx.storeStock.create({ data: { itemId: ti.itemId, storeId: input.toStoreId, quantity: ti.quantity } });
      }

      // Update transfer item cost
      await tx.stockTransferItem.update({ where: { id: ti.id }, data: { unitCost: avgUnitCost } });

      // Create TRANSFER_OUT + TRANSFER_IN transactions
      const txnCode1 = await nextTxnCode(tx);
      await tx.stockTransaction.create({
        data: {
          code: txnCode1, itemId: ti.itemId, storeId: input.fromStoreId, type: "TRANSFER_OUT",
          quantity: -ti.quantity, unitCost: avgUnitCost, balanceBefore: srcStock.quantity,
          balanceAfter: srcStock.quantity - ti.quantity,
          referenceType: "TRANSFER", referenceId: tr.id, userId: input.transferredById, remarks: `Transfer ${code} out`,
        },
      });
      const txnCode2 = await nextTxnCode(tx);
      await tx.stockTransaction.create({
        data: {
          code: txnCode2, itemId: ti.itemId, storeId: input.toStoreId, type: "TRANSFER_IN",
          quantity: ti.quantity, unitCost: avgUnitCost, balanceBefore: destStock?.quantity ?? 0,
          balanceAfter: (destStock?.quantity ?? 0) + ti.quantity,
          referenceType: "TRANSFER", referenceId: tr.id, userId: input.transferredById, remarks: `Transfer ${code} in`,
        },
      });

      // Stock moved between stores, so the item's overall level may have crossed
      // a reorder threshold in either direction.
      await refreshItemStatus(tx, ti.itemId);
    }

    return tr;
  });

  await recordAudit({
    ctx: { userId: auditCtx?.userId, ipAddress: auditCtx?.ip },
    action: "STOCK_TRANSFERRED", module: "transfers", entity: "transfer", entityId: transfer.id,
    newValue: { code, fromStoreId: input.fromStoreId, toStoreId: input.toStoreId, totalQuantity, itemCount: input.items.length },
  });

  return getTransfer(transfer.id);
}
