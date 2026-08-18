import { Router, Response } from "express";
import { ok, paginate } from "../utils/response";
import { asyncHandler, requirePermission, AuthedRequest } from "../middleware/auth";
import { qp, qpInt } from "../utils/query";
import * as svc from "../services/reports";

const router = Router();

router.get("/inventory", requirePermission("reports.view"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const params = {
    categoryId: qp(req, "categoryId"), warehouseId: qp(req, "warehouseId"),
    status: qp(req, "status"), lowStockOnly: qp(req, "lowStockOnly") === "true",
  };
  const result = await svc.inventoryReport(params);
  res.json(ok(result));
}));

router.get("/valuation", requirePermission("reports.view"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const params = { categoryId: qp(req, "categoryId"), warehouseId: qp(req, "warehouseId") };
  const result = await svc.valuationReport(params);
  res.json(ok(result));
}));

router.get("/movement", requirePermission("reports.view"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const params = {
    startDate: qp(req, "startDate"), endDate: qp(req, "endDate"),
    warehouseId: qp(req, "warehouseId"), itemId: qp(req, "itemId"),
    type: qp(req, "type"), userId: qp(req, "userId"),
    page: qpInt(req, "page", 1), limit: qpInt(req, "limit", 50),
  };
  const result = await svc.movementReport(params);
  res.json(ok(paginate(result.items, result.total, params.page, params.limit)));
}));

router.get("/audit", requirePermission("audit.view"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const params = {
    startDate: qp(req, "startDate"), endDate: qp(req, "endDate"),
    userId: qp(req, "userId"), module: qp(req, "module"), action: qp(req, "action"),
    page: qpInt(req, "page", 1), limit: qpInt(req, "limit", 50),
  };
  const result = await svc.auditReport(params);
  res.json(ok(paginate(result.items, result.total, params.page, params.limit)));
}));

export default router;
