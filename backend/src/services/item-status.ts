import { Prisma, ItemStatus } from "@prisma/client";
import { prisma } from "../config/db";

// Accepts either the Prisma client or a transaction client, so callers inside a
// $transaction keep their atomicity guarantee.
type Db = Prisma.TransactionClient;

// These describe the item itself rather than its stock level, so a stock
// movement must never overwrite them.
const MANUAL_STATUSES: ItemStatus[] = ["DAMAGED", "OBSOLETE", "DISPOSED"];

export function deriveItemStatus(quantity: number, reorderLevel: number): ItemStatus {
  if (quantity <= 0) return "OUT_OF_STOCK";
  if (quantity <= reorderLevel) return "LOW_STOCK";
  return "AVAILABLE";
}

/**
 * Recomputes InventoryItem.status from the stock actually on hand.
 *
 * Before this existed, status stayed AVAILABLE forever, so the dashboard's
 * "Low Stock Items" and "Out of Stock" counters were always 0 and the inventory
 * status filter matched nothing — while the notification bell, which computes
 * stock levels live, correctly reported the same items as out of stock.
 *
 * Call it for every affected item inside the receipt/issue/transfer transaction.
 */
export async function refreshItemStatus(db: Db, itemId: string): Promise<void> {
  const item = await db.inventoryItem.findUnique({
    where: { id: itemId },
    select: { status: true, reorderLevel: true },
  });
  if (!item || MANUAL_STATUSES.includes(item.status)) return;

  const agg = await db.storeStock.aggregate({
    where: { itemId },
    _sum: { quantity: true },
  });
  const next = deriveItemStatus(agg._sum.quantity ?? 0, item.reorderLevel);

  if (next !== item.status) {
    await db.inventoryItem.update({ where: { id: itemId }, data: { status: next } });
  }
}

/**
 * Recomputes every item's status in one pass. Used by the seed and by
 * `npm run db:refresh-status` to correct databases written before the fix.
 */
export async function refreshAllItemStatuses(): Promise<{ scanned: number; updated: number }> {
  const items = await prisma.inventoryItem.findMany({
    where: { deletedAt: null, status: { notIn: MANUAL_STATUSES } },
    select: { id: true, status: true, reorderLevel: true },
  });

  // One grouped query for all quantities rather than one query per item.
  const sums = await prisma.storeStock.groupBy({
    by: ["itemId"],
    _sum: { quantity: true },
  });
  const onHand = new Map(sums.map((s) => [s.itemId, s._sum.quantity ?? 0]));

  let updated = 0;
  for (const item of items) {
    const next = deriveItemStatus(onHand.get(item.id) ?? 0, item.reorderLevel);
    if (next !== item.status) {
      await prisma.inventoryItem.update({ where: { id: item.id }, data: { status: next } });
      updated++;
    }
  }
  return { scanned: items.length, updated };
}
