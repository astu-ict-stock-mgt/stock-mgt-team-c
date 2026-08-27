import { Prisma } from "@prisma/client";
import { Errors } from "../utils/errors";

/**
 * Links a stock issue back to the requisition it fulfils.
 *
 * Before this existed, StockIssue.requisitionId was stored and then ignored:
 * RequisitionItem.fulfilledQty stayed 0 forever, the requisition never left
 * APPROVED, the same approved requisition could be issued an unlimited number of
 * times, and the UI's FULFILLED / PARTIALLY_FULFILLED filters could never match
 * anything.
 *
 * Runs inside the issue transaction so an over-issue rolls the whole issue back.
 */

const ISSUABLE_STATUSES = ["APPROVED", "PARTIALLY_FULFILLED"];

export async function applyRequisitionFulfilment(
  tx: Prisma.TransactionClient,
  requisitionId: string,
  issuedItems: Array<{ itemId: string; quantity: number }>
): Promise<{ code: string; status: string }> {
  const requisition = await tx.requisition.findUnique({
    where: { id: requisitionId },
    include: { items: { include: { item: { select: { code: true, name: true } } } } },
  });
  if (!requisition) throw Errors.notFound("Requisition", requisitionId);

  if (!ISSUABLE_STATUSES.includes(requisition.status)) {
    throw Errors.invalidRequisition(
      `Requisition ${requisition.code} is ${requisition.status} — only an approved requisition can be issued against`
    );
  }

  // Sum per item first: the same item may appear on more than one issue line.
  const issuedByItem = new Map<string, number>();
  for (const line of issuedItems) {
    issuedByItem.set(line.itemId, (issuedByItem.get(line.itemId) ?? 0) + line.quantity);
  }

  for (const [itemId, quantity] of issuedByItem) {
    const requested = requisition.items.find((ri) => ri.itemId === itemId);
    if (!requested) {
      throw Errors.invalidRequisition(
        `Item ${itemId} is not on requisition ${requisition.code}`
      );
    }
    const remaining = requested.quantity - requested.fulfilledQty;
    if (quantity > remaining) {
      throw Errors.invalidRequisition(
        `Cannot issue ${quantity} × ${requested.item.code} against requisition ${requisition.code} — only ${remaining} of ${requested.quantity} remain`
      );
    }
    await tx.requisitionItem.update({
      where: { id: requested.id },
      data: { fulfilledQty: requested.fulfilledQty + quantity },
    });
  }

  // Re-read to decide the status from the persisted totals.
  const updatedItems = await tx.requisitionItem.findMany({ where: { requisitionId } });
  const fullyFulfilled = updatedItems.every((ri) => ri.fulfilledQty >= ri.quantity);
  const anyFulfilled = updatedItems.some((ri) => ri.fulfilledQty > 0);
  const nextStatus = fullyFulfilled ? "FULFILLED" : anyFulfilled ? "PARTIALLY_FULFILLED" : requisition.status;

  if (nextStatus !== requisition.status) {
    await tx.requisition.update({ where: { id: requisitionId }, data: { status: nextStatus as any } });
  }

  return { code: requisition.code, status: nextStatus };
}
