import { z } from "zod";

export const TransferItemSchema = z.object({
  itemId: z.string().min(1, "Item ID is required"),
  quantity: z.number().positive("Quantity must be positive"),
});

export const CreateTransferSchema = z.object({
  fromStoreId: z.string().min(1, "Source Store ID is required"),
  toStoreId: z.string().min(1, "Destination Store ID is required"),
  reason: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(TransferItemSchema).min(1, "At least one item is required"),
});

export const BinAllocationSchema = z.object({
  binId: z.string().min(1),
  quantity: z.number().positive("Quantity must be positive"),
});

export const DispatchTransferItemSchema = z.object({
  itemId: z.string().min(1),
  allocations: z.array(BinAllocationSchema).min(1, "Bin allocations are required"),
});

export const DispatchTransferSchema = z.object({
  items: z.array(DispatchTransferItemSchema).min(1, "At least one item must be dispatched"),
});

export const ReceiveTransferItemSchema = z.object({
  itemId: z.string().min(1),
  receivedQty: z.number().min(0, "Received quantity cannot be negative"),
  allocations: z.array(BinAllocationSchema).min(1, "Bin allocations are required"),
});

export const ReceiveTransferSchema = z.object({
  items: z.array(ReceiveTransferItemSchema).min(1, "At least one item must be received"),
});
