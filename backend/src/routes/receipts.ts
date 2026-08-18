import { Router, Response } from "express";
import { ok, paginate } from "../utils/response";
import { asyncHandler, requirePermission, AuthedRequest } from "../middleware/auth";
import { qp, qpInt } from "../utils/query";
import * as svc from "../services/receipts";
import * as val from "../validators";

const router = Router();

router.get("/", requirePermission("inventory.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const params = {
    page: qpInt(req, "page", 1), limit: qpInt(req, "limit", 20),
    search: qp(req, "search"), supplierId: qp(req, "supplierId"),
    warehouseId: qp(req, "warehouseId"), status: qp(req, "status"),
  };
  const result = await svc.listReceipts(params);
  res.json(ok(paginate(result.items, result.total, params.page, params.limit)));
}));

router.post("/", requirePermission("stock.receive"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.receiptSchema.parse(req.body);
  const r = await svc.createReceipt({ ...body, receivedById: req.userId! }, { userId: req.userId, ip: (req as any)._clientIp });
  res.status(201).json(ok(r, "Stock received successfully"));
}));

router.get("/:id", requirePermission("inventory.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const r = await svc.getReceipt(req.params.id);
  res.json(ok(r));
}));

export default router;
