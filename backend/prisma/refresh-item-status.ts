/**
 * Recomputes InventoryItem.status for every item from the stock on hand.
 *
 * Databases written before the status fix have every item stuck on AVAILABLE,
 * even at zero quantity. Run once against an existing database:
 *
 *   npm run db:refresh-status
 *
 * Safe to re-run; it only writes rows whose status actually changes and never
 * touches DAMAGED / OBSOLETE / DISPOSED items.
 */
import { prisma } from "../src/config/db";
import { refreshAllItemStatuses } from "../src/services/item-status";

async function main() {
  const { scanned, updated } = await refreshAllItemStatuses();
  console.log(`✅ Item status refresh complete — ${scanned} item(s) scanned, ${updated} updated.`);
}

main()
  .catch((err) => {
    console.error("❌ Item status refresh failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
