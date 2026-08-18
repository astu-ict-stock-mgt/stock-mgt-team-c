import { Router, Response } from "express";
import { ok, paginate } from "../utils/response";
import { asyncHandler, requirePermission, AuthedRequest } from "../middleware/auth";
import { qp, qpInt } from "../utils/query";
import * as svc from "../services/transfers";
import * as val from "../validators";

const router = Router();

router.get("/", requirePermission("inventory.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const params = {
    page: qpInt(req, "page", 1), limit: qpInt(req, "limit", 20),
    search: qp(req, "search"), fromStoreId: qp(req, "fromStoreId"),
    toStoreId: qp(req, "toStoreId"), status: qp(req, "status"),
  };
  const result = await svc.listTransfers(params);
  res.json(ok(paginate(result.items, result.total, params.page, params.limit)));
}));

router.post("/", requirePermission("stock.transfer"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.transferSchema.parse(req.body);
  const t = await svc.createTransfer({ ...body, transferredById: req.userId! }, { userId: req.userId, ip: (req as any)._clientIp });
  res.status(201).json(ok(t, "Stock transferred successfully"));
}));

router.get("/:id", requirePermission("inventory.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const t = await svc.getTransfer(req.params.id);
  res.json(ok(t));
}));

export default router;
