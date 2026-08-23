import { Router, Response } from "express";
import { ok } from "../utils/response";
import { asyncHandler, requirePermission, AuthedRequest } from "../middleware/auth";
import * as svc from "../services/stores";
import * as val from "../validators/stores";

const router = Router();

router.get("/:id", requirePermission("bins.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const bin = await svc.getBin(req.params.id);
  res.json(ok(bin));
}));

router.patch("/:id", requirePermission("bins.update"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.binSchema.partial().parse(req.body);
  const bin = await svc.updateBin(req.params.id, body, { userId: req.userId, ip: req.ip });
  res.json(ok(bin, "Bin updated"));
}));

router.delete("/:id", requirePermission("bins.delete"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  await svc.deleteBin(req.params.id, { userId: req.userId, ip: req.ip });
  res.json(ok({ deleted: true }, "Bin deleted"));
}));

export default router;
