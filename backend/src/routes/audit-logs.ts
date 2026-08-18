import { Router, Response } from "express";
import { ok, paginate } from "../utils/response";
import { asyncHandler, requirePermission, requireAuth, AuthedRequest } from "../middleware/auth";
import { qp, qpInt } from "../utils/query";
import * as svc from "../services/audit-logs";

const router = Router();

router.get("/", requirePermission("audit.view"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const params = {
    page: qpInt(req, "page", 1), limit: qpInt(req, "limit", 25),
    search: qp(req, "search"), userId: qp(req, "userId"),
    module: qp(req, "module"), action: qp(req, "action"),
    startDate: qp(req, "startDate"), endDate: qp(req, "endDate"),
  };
  const result = await svc.listAuditLogs(params);
  res.json(ok(paginate(result.items, result.total, params.page, params.limit)));
}));

export default router;
