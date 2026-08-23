import { Router, Response } from "express";
import { ok } from "../utils/response";
import { asyncHandler, AuthedRequest, requirePermission } from "../middleware/auth";
import { listGRNs, getGRN } from "../services/grn";

const router = Router();

router.get("/", requirePermission("grns.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const grns = await listGRNs({
    storeId: req.query.storeId as string,
    search: req.query.search as string
  });
  res.json(ok(grns));
}));

router.get("/:id", requirePermission("grns.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const grn = await getGRN(req.params.id);
  res.json(ok(grn));
}));

export default router;
