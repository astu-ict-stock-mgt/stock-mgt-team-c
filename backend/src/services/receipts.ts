import { Errors } from "../utils/errors";

// Legacy receipts logic depends on old StockReceipt and Warehouse models.
// Pending Phase 3 implementation for GoodsReceipt -> TEC -> GRN workflow.

export async function createReceipt(data: any, ctx: any) {
  throw Errors.notImplemented("Receiving workflow pending Phase 3");
}

export async function approveReceipt(id: string, ctx: any) {
  throw Errors.notImplemented("Receiving workflow pending Phase 3");
}

export async function rejectReceipt(id: string, reason: string, ctx: any) {
  throw Errors.notImplemented("Receiving workflow pending Phase 3");
}

export async function listReceipts(params: any = {}) {
  throw Errors.notImplemented("Receiving workflow pending Phase 3");
}

export async function getReceipt(id: string) {
  throw Errors.notImplemented("Receiving workflow pending Phase 3");
}
