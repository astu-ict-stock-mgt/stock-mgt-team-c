import { z } from "zod";

export const CreateStockTakeSchema = z.object({
  storeId: z.string().min(1, "Store ID is required"),
  notes: z.string().optional(),
});

export const StockTakeItemSchema = z.object({
  itemId: z.string().min(1, "Item ID is required"),
  binId: z.string().min(1, "Bin ID is required"),
});

export const AddStockTakeItemsSchema = z.object({
  items: z.array(StockTakeItemSchema).min(1, "At least one item is required"),
});

export const RecordCountItemSchema = z.object({
  itemId: z.string().min(1, "Item ID is required"),
  binId: z.string().min(1, "Bin ID is required"),
  physicalQty: z.number().min(0, "Physical quantity cannot be negative"),
  unitCostOverride: z.number().min(0, "Unit cost must be non-negative").optional(),
  remarks: z.string().optional(),
});

export const RecordCountSchema = z.object({
  items: z.array(RecordCountItemSchema).min(1, "At least one item must be counted"),
});
