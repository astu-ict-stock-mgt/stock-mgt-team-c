// FIFO valuation engine.
// Each receipt creates a FifoLayer (item, warehouse, originalQty, remainingQty, unitCost).
// Each issue consumes from the OLDEST layer with remaining quantity.
// All mutations happen inside a Prisma transaction (caller's responsibility).

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { Errors } from "@/lib/utils/errors";

export type FifoConsumption = {
  layerId: string;
  quantity: number;
  unitCost: number;
  cogs: number;
};

export async function createFifoLayersForReceiptTx(
  tx: Prisma.TransactionClient,
  params: {
    itemId: string;
    warehouseId: string;
    receiptId: string;
    quantity: number;
    unitCost: number;
  }
): Promise<void> {
  await tx.fifoLayer.create({
    data: {
      itemId: params.itemId,
      warehouseId: params.warehouseId,
      receiptId: params.receiptId,
      originalQty: params.quantity,
      remainingQty: params.quantity,
      unitCost: params.unitCost,
    },
  });
}

// Consume `quantity` units from the oldest FIFO layers for the item/warehouse.
// Returns the list of layers consumed + the weighted average unit cost + total COGS.
export async function consumeFifoTx(
  tx: Prisma.TransactionClient,
  params: {
    itemId: string;
    warehouseId: string;
    quantity: number;
  }
): Promise<{ consumptions: FifoConsumption[]; totalCogs: number; avgUnitCost: number }> {
  const { itemId, warehouseId, quantity } = params;
  if (quantity <= 0) {
    return { consumptions: [], totalCogs: 0, avgUnitCost: 0 };
  }

  // SELECT ... FOR UPDATE semantics — SQLite doesn't support row locks but the
  // enclosing $transaction serializes concurrent operations on the same item.
  const layers = await tx.fifoLayer.findMany({
    where: { itemId, warehouseId, remainingQty: { gt: 0 } },
    orderBy: { createdAt: "asc" },
  });

  const available = layers.reduce((sum, l) => sum + l.remainingQty, 0);
  if (available < quantity) {
    throw Errors.insufficientStock(itemId, quantity, available);
  }

  let remaining = quantity;
  const consumptions: FifoConsumption[] = [];
  let totalCogs = 0;

  for (const layer of layers) {
    if (remaining <= 0) break;
    const take = Math.min(layer.remainingQty, remaining);
    const cogs = take * layer.unitCost;
    await tx.fifoLayer.update({
      where: { id: layer.id },
      data: { remainingQty: layer.remainingQty - take },
    });
    consumptions.push({ layerId: layer.id, quantity: take, unitCost: layer.unitCost, cogs });
    totalCogs += cogs;
    remaining -= take;
  }

  return {
    consumptions,
    totalCogs,
    avgUnitCost: quantity > 0 ? totalCogs / quantity : 0,
  };
}

// Compute current stock + FIFO value for an item at a given warehouse.
export async function computeStockValue(itemId: string, warehouseId?: string) {
  const where: any = { itemId };
  if (warehouseId) where.warehouseId = warehouseId;
  const layers = await db.fifoLayer.findMany({ where, orderBy: { createdAt: "asc" } });
  const totalQty = layers.reduce((s, l) => s + l.remainingQty, 0);
  const totalValue = layers.reduce((s, l) => s + l.remainingQty * l.unitCost, 0);
  return {
    quantity: totalQty,
    value: totalValue,
    avgUnitCost: totalQty > 0 ? totalValue / totalQty : 0,
    layers: layers.map((l) => ({
      id: l.id,
      originalQty: l.originalQty,
      remainingQty: l.remainingQty,
      unitCost: l.unitCost,
      createdAt: l.createdAt.toISOString(),
    })),
  };
}
