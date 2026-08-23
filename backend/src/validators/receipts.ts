import { z } from "zod";

export const CreateGoodsReceiptItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().positive(),
  unitCost: z.number().min(0),
  condition: z.string().optional(),
  binId: z.string().optional(),
  remarks: z.string().optional()
});

export const CreateGoodsReceiptSchema = z.object({
  supplierId: z.string().min(1),
  storeId: z.string().min(1),
  deliveryNote: z.string().optional(),
  purchaseOrder: z.string().optional(),
  inspectionNotes: z.string().optional(),
  items: z.array(CreateGoodsReceiptItemSchema).min(1)
});

export const UpdateGoodsReceiptSchema = CreateGoodsReceiptSchema.partial();

export const TechnicalEvaluationItemSchema = z.object({
  goodsReceiptItemId: z.string().min(1),
  acceptedQuantity: z.number().min(0),
  rejectedQuantity: z.number().min(0),
  condition: z.string().optional(),
  decision: z.enum(["APPROVED", "REJECTED", "APPROVED_WITH_CONDITIONS", "PENDING"]),
  remarks: z.string().optional()
}).refine(data => {
  // Validate that at least one of accepted or rejected > 0
  return data.acceptedQuantity > 0 || data.rejectedQuantity > 0;
}, {
  message: "Either accepted or rejected quantity must be greater than 0",
  path: ["acceptedQuantity"]
});

export const SubmitEvaluationSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "APPROVED_WITH_CONDITIONS"]),
  comments: z.string().optional(),
  items: z.array(TechnicalEvaluationItemSchema).min(1)
});

export const GenerateGRNSchema = z.object({
  notes: z.string().optional()
});
