import { prisma } from "../config/db";

export async function computeStockValue(itemId: string, warehouseId?: string) {
  const where: any = { itemId };
  if (warehouseId) where.warehouseId = warehouseId;
  const layers = await prisma.fifoLayer.findMany({ where, orderBy: { createdAt: "asc" } });
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
