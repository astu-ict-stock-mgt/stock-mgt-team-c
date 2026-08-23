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

  if (!receipt) throw Errors.notFound("Receipt");
  
  if (receipt.status !== "SUBMITTED" && receipt.status !== "UNDER_EVALUATION") {
    throw Errors.validation("Receipt must be SUBMITTED to evaluate", "INVALID_STATE");
  }
  
  if (receipt.evaluation) {
    throw Errors.validation("Receipt already has an evaluation", "ALREADY_EVALUATED");
  }

  const receiptItemIds = receipt.items.map(i => i.id);
  for (const item of data.items) {
    if (!receiptItemIds.includes(item.goodsReceiptItemId)) {
      throw Errors.validation(`Item ${item.goodsReceiptItemId} does not belong to this receipt`, "INVALID_ITEM");
    }
    const matchingReceiptItem = receipt.items.find(i => i.id === item.goodsReceiptItemId);
    if (!matchingReceiptItem) continue;
    
    // Ensure accepted + rejected equals the original quantity (or at least doesn't exceed it)
    if (item.acceptedQuantity + item.rejectedQuantity > matchingReceiptItem.quantity) {
      throw Errors.validation(`Evaluated quantities for item ${matchingReceiptItem.id} exceed received quantity`, "INVALID_QUANTITY");
    }
  }

  // Determine next status for Goods Receipt
  const nextStatus = data.decision === "REJECTED" ? "REJECTED" : "ACCEPTED";

  const evaluation = await prisma.$transaction(async (tx) => {
    // Create evaluation
    const evalRecord = await tx.technicalEvaluation.create({
      data: {
        receipt: { connect: { id: receiptId } },
        evaluator: { connect: { id: ctx.userId! } },
        decision: data.decision,
        comments: data.comments,
        items: {
          create: data.items.map(i => ({
            goodsReceiptItem: { connect: { id: i.goodsReceiptItemId } },
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
