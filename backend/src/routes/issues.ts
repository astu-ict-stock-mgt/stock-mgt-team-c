import { Router, Response } from "express";
import { ok, paginate } from "../utils/response";
import { asyncHandler, requirePermission, AuthedRequest } from "../middleware/auth";
import { qp, qpInt } from "../utils/query";
import * as svc from "../services/issues";
import * as val from "../validators";

const router = Router();

router.get("/", requirePermission("inventory.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const params = { page: qpInt(req, "page", 1), limit: qpInt(req, "limit", 20), search: qp(req, "search"), warehouseId: qp(req, "warehouseId"), status: qp(req, "status") };
  const result = await svc.listIssues(params);
  res.json(ok(paginate(result.items, result.total, params.page, params.limit)));
}));

router.post("/", requirePermission("stock.issue"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.issueSchema.parse(req.body);
  const i = await svc.createIssue({ ...body, issuedById: req.userId! }, { userId: req.userId, ip: (req as any)._clientIp });
  res.status(201).json(ok(i, "Stock issued successfully"));
}));

router.get("/:id", requirePermission("inventory.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const i = await svc.getIssue(req.params.id);
  res.json(ok(i));
}));

export default router;
