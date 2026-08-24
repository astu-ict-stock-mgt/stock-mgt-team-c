import { Router, Response } from "express";
import { ok } from "../utils/response";
import { asyncHandler, AuthedRequest, requirePermission } from "../middleware/auth";
import { executeBinTransfer } from "../services/bintransfers";
import { ExecuteBinTransferSchema } from "../validators/bintransfers";

const router = Router();

router.post("/", requirePermission("bintransfers.execute"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = ExecuteBinTransferSchema.parse(req.body);
  const btr = await executeBinTransfer(data, { userId: req.userId, ipAddress: req.ip });
  res.status(201).json(ok(btr));
}));

export default router;
