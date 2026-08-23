import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { recordAudit, AuditContext } from "./audit";

export async function submitEvaluation(
  receiptId: string, 
  data: { 
    decision: "APPROVED" | "REJECTED" | "APPROVED_WITH_CONDITIONS"; 
    comments?: string; 
    items: {
      goodsReceiptItemId: string;
      acceptedQuantity: number;
      rejectedQuantity: number;
      condition?: string;
      decision: "APPROVED" | "REJECTED" | "APPROVED_WITH_CONDITIONS" | "PENDING";
      remarks?: string;
    }[] 
  }, 
  ctx: AuditContext
) {
  if (!ctx.userId) throw Errors.unauthorized();

  const receipt = await prisma.goodsReceipt.findUnique({
    where: { id: receiptId },
    include: { items: true, evaluation: true }
  });

  if (!receipt) throw Errors.notFound("Receipt not found");
  
  // Rule: Only SUBMITTED receipts can be evaluated (or UNDER_EVALUATION if they want to update it).
  // The prompt says SUBMITTED -> UNDER_EVALUATION -> ACCEPTED/REJECTED.
  // When an evaluation is submitted with a final decision, it transitions to ACCEPTED or REJECTED.
  // If it's a draft evaluation, it might be UNDER_EVALUATION. 
  // Let's assume submitting an evaluation finalizes it immediately based on decision.
  if (receipt.status !== "SUBMITTED" && receipt.status !== "UNDER_EVALUATION") {
    throw Errors.badRequest("INVALID_STATE", "Receipt must be SUBMITTED to evaluate");
  }
  
  if (receipt.evaluation) {
    throw Errors.badRequest("ALREADY_EVALUATED", "Receipt already has an evaluation");
  }

  // Validate items match receipt items
  const receiptItemIds = receipt.items.map(i => i.id);
  for (const item of data.items) {
    if (!receiptItemIds.includes(item.goodsReceiptItemId)) {
      throw Errors.badRequest("INVALID_ITEM", `Item ${item.goodsReceiptItemId} does not belong to this receipt`);
    }
    const matchingReceiptItem = receipt.items.find(i => i.id === item.goodsReceiptItemId);
    if (!matchingReceiptItem) continue;
    
    // Ensure accepted + rejected equals the original quantity (or at least doesn't exceed it)
    if (item.acceptedQuantity + item.rejectedQuantity > matchingReceiptItem.quantity) {
      throw Errors.badRequest("INVALID_QUANTITY", `Evaluated quantities for item ${matchingReceiptItem.id} exceed received quantity`);
    }
  }

  // Determine next status for Goods Receipt
  const nextStatus = data.decision === "REJECTED" ? "REJECTED" : "ACCEPTED";

  const evaluation = await prisma.$transaction(async (tx) => {
    // Create evaluation
    const evalRecord = await tx.technicalEvaluation.create({
      data: {
        receiptId,
        evaluatorId: ctx.userId!,
        decision: data.decision,
        comments: data.comments,
        items: {
          create: data.items.map(i => ({
            goodsReceiptItemId: i.goodsReceiptItemId,
            acceptedQuantity: i.acceptedQuantity,
            rejectedQuantity: i.rejectedQuantity,
            condition: i.condition,
            decision: i.decision,
            remarks: i.remarks
          }))
        }
      },
      include: { items: true }
    });

    // Update GoodsReceipt status
    await tx.goodsReceipt.update({
      where: { id: receiptId },
      data: { status: nextStatus }
    });

    return evalRecord;
  });

  await recordAudit({
    ctx,
    action: "EVALUATE",
    module: "RECEIPTS",
    entity: "TechnicalEvaluation",
    entityId: evaluation.id,
    newValue: evaluation
  });

  return evaluation;
}
