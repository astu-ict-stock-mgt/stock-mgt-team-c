import { Errors } from "../utils/errors";

// Legacy FIFO consume logic depends on old Stock models.
// Pending Phase 4 implementation.

export async function consumeFifo(data: any, ctx: any) {
  throw Errors.notImplemented("FIFO consume workflow pending later phases");
}
