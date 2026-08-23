import { Errors } from "../utils/errors";

export async function getDashboardStats(roles: Set<string>, userId: string) {
  // Legacy dashboard logic depends on old StockReceipt and StockIssue models.
  // Pending Phase 3/4 implementation.
  throw Errors.notImplemented("Dashboard reporting pending Phase 3/4");
}
