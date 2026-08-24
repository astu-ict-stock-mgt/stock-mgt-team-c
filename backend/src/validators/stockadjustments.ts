import { z } from "zod";

export const ApproveStockAdjustmentSchema = z.object({
  items: z.array(z.object({
    itemId: z.string().min(1),
    binId: z.string().min(1),
    unitCost: z.number().positive().optional(),
  })).optional(),
});
