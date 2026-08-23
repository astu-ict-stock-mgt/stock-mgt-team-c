import { z } from "zod";

const SIVItemAllocationSchema = z.object({
  binId: z.string().cuid(),
  quantity: z.number().positive(),
});

const SIVItemSchema = z.object({
  itemId: z.string().cuid(),
  quantity: z.number().positive(),
  allocations: z.array(SIVItemAllocationSchema).min(1, "At least one bin allocation is required"),
});

export const CreateSIVSchema = z.object({
  requisitionId: z.string().cuid(),
  storeId: z.string().cuid(),
  voucherType: z.enum(["SIV", "ISIV"]),
  destinationStoreId: z.string().cuid().optional(),
  notes: z.string().optional(),
  items: z.array(SIVItemSchema).min(1, "At least one item is required"),
}).refine(data => {
  if (data.voucherType === "ISIV" && !data.destinationStoreId) return false;
  if (data.voucherType === "SIV" && data.destinationStoreId) return false;
  return true;
}, {
  message: "ISIV requires destinationStoreId; standard SIV must NOT have destinationStoreId",
  path: ["destinationStoreId"]
});

export const AmendSIVSchema = z.object({
  notes: z.string().optional(),
  items: z.array(SIVItemSchema).min(1, "At least one item is required"),
});

export const ApproveSIVSchema = z.object({
  notes: z.string().optional(),
});

export const RejectSIVSchema = z.object({
  notes: z.string().min(1, "Rejection reason is required"),
});
