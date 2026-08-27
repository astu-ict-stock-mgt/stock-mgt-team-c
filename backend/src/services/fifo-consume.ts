import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { nextDocumentCode } from "../utils/document-code";

// One consumed slice of a FIFO layer. `receiptId` is carried out so a caller that
// re-lands the goods somewhere else — a transfer into another store — can point the
// new layer at the receipt the goods actually arrived on, rather than inventing a
// reference. It is null when the source layer was itself an adjustment.
export type FifoConsumption = {
  layerId: string;
  receiptId: string | null;
  quantity: number;
  unitCost: number;
  cogs: number;
};

// Consume `quantity` units from the oldest FIFO layers (oldest-first).
// Must be called inside a Prisma $transaction.
export async function consumeFifoTx(
  tx: Prisma.TransactionClient,
  params: { itemId: string; storeId: string; quantity: number }
): Promise<{ consumptions: FifoConsumption[]; totalCogs: number; avgUnitCost: number }> {
  const { itemId, storeId, quantity } = params;
  if (quantity <= 0) return { consumptions: [], totalCogs: 0, avgUnitCost: 0 };

  const layers = await tx.fifoLayer.findMany({
    where: { itemId, storeId, remainingQty: { gt: 0 } },
    orderBy: { createdAt: "asc" },
  });

  const available = layers.reduce((s, l) => s + l.remainingQty, 0);
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
    consumptions.push({
      layerId: layer.id,
      receiptId: layer.receiptId,
      quantity: take,
      unitCost: layer.unitCost,
      cogs,
    });
    totalCogs += cogs;
    remaining -= take;
  }

  return { consumptions, totalCogs, avgUnitCost: quantity > 0 ? totalCogs / quantity : 0 };
}

export async function nextTxnCode(tx: Prisma.TransactionClient): Promise<string> {
  return nextDocumentCode("TXN", (startsWith) =>
    tx.stockTransaction.count({ where: { code: { startsWith } } })
  );
}
