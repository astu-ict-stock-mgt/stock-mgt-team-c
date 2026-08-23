import { Errors } from "../utils/errors";

// Legacy FIFO logic depends on old Stock models.
// Pending Phase 3/4 implementation.

export async function addFifoLayer(data: any, ctx: any) {
  throw Errors.notImplemented("FIFO workflow pending later phases");
}

export async function computeStockValue(itemId: string, storeId?: string) {
  // Stub for now, returning 0 so inventory list doesn't break
  return { avgUnitCost: 0, quantity: 0, value: 0, layers: [] };
}
