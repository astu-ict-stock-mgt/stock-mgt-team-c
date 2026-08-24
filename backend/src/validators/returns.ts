import { z } from "zod";

export const ReturnItemSchema = z.object({
  itemId: z.string().min(1, "Item ID is required"),
  quantity: z.number().positive("Quantity must be positive"),
  reason: z.string().optional(),
  condition: z.string().optional(),
});

export const CreateReturnSchema = z.object({
  storeId: z.string().min(1, "Store ID is required"),
  department: z.string().min(1, "Department is required"),
  originalSivId: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(ReturnItemSchema).min(1, "At least one item is required"),
});

export const EvaluateReturnItemSchema = z.object({
  itemId: z.string().min(1),
  acceptedQty: z.number().min(0, "Accepted quantity cannot be negative"),
});

export const EvaluateReturnSchema = z.object({
  items: z.array(EvaluateReturnItemSchema).min(1, "At least one evaluated item is required"),
  notes: z.string().optional(),
});

export const ReturnBinAllocationSchema = z.object({
  binId: z.string().min(1),
  quantity: z.number().positive("Quantity must be positive"),
});

export const ReceiveReturnItemSchema = z.object({
  itemId: z.string().min(1),
  allocations: z.array(ReturnBinAllocationSchema).min(1, "Bin allocations are required"),
});

export const ReceiveReturnSchema = z.object({
  items: z.array(ReceiveReturnItemSchema).min(1, "At least one item is required to receive"),
});
