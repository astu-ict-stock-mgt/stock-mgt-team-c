import { z } from "zod";

export const ExecuteBinTransferSchema = z.object({
  itemId: z.string().min(1, "Item ID is required"),
  fromBinId: z.string().min(1, "Source Bin ID is required"),
  toBinId: z.string().min(1, "Destination Bin ID is required"),
  quantity: z.number().positive("Quantity must be positive"),
});
