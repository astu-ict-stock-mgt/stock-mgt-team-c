import { Router, Response } from "express";
import { ok } from "../utils/response";
import { asyncHandler, requireAuth, requirePermission, AuthedRequest } from "../middleware/auth";
import { getDashboardStats } from "../services/dashboard";

const router = Router();

router.get("/", requirePermission("dashboard.view"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const stats = await getDashboardStats(req.roles, req.userId!);
  res.json(ok(stats));
}));

export default router;
