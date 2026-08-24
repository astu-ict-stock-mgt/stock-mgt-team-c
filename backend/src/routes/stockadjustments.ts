import { Router, Response } from "express";
import { ok } from "../utils/response";
import { asyncHandler, AuthedRequest, requirePermission } from "../middleware/auth";
import {
  listStockAdjustments,
  getStockAdjustment,
  approveStockAdjustment,
  rejectStockAdjustment,
  postStockAdjustment,
} from "../services/stockadjustments";
import { ApproveStockAdjustmentSchema } from "../validators/stockadjustments";

const router = Router();

router.get("/", requirePermission("stockadjustments.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const items = await listStockAdjustments({
    storeId: req.query.storeId as string | undefined,
    status: req.query.status as any,
    stockTakeId: req.query.stockTakeId as string | undefined,
  });
  res.json(ok({ items }));
}));

router.get("/:id", requirePermission("stockadjustments.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const adj = await getStockAdjustment(req.params.id);
  res.json(ok(adj));
}));

router.post("/:id/approve", requirePermission("stockadjustments.approve"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = ApproveStockAdjustmentSchema.parse(req.body ?? {});
  const adj = await approveStockAdjustment(req.params.id, data, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(adj));
}));

router.post("/:id/reject", requirePermission("stockadjustments.approve"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const adj = await rejectStockAdjustment(req.params.id, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(adj));
}));

router.post("/:id/post", requirePermission("stockadjustments.post"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const adj = await postStockAdjustment(req.params.id, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(adj));
}));

export default router;
