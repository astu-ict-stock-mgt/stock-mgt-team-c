import { Router, Response } from "express";
import { ok, paginate } from "../utils/response";
import { asyncHandler, requirePermission, AuthedRequest } from "../middleware/auth";
import { qp, qpInt } from "../utils/query";
import * as svc from "../services/suppliers";
import * as val from "../validators";

const router = Router();

router.get("/", requirePermission("suppliers.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const params = { page: qpInt(req, "page", 1), limit: qpInt(req, "limit", 20), search: qp(req, "search"), status: qp(req, "status") };
  const result = await svc.listSuppliers(params);
  res.json(ok(paginate(result.items, result.total, params.page, params.limit)));
}));

router.post("/", requirePermission("suppliers.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.supplierSchema.parse(req.body);
  const s = await svc.createSupplier(body, { userId: req.userId });
  res.status(201).json(ok(s, "Supplier created"));
}));

router.get("/:id", requirePermission("suppliers.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const s = await svc.getSupplier(req.params.id);
  res.json(ok(s));
}));

router.patch("/:id", requirePermission("suppliers.update"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.supplierSchema.partial().parse(req.body);
  const s = await svc.updateSupplier(req.params.id, body, { userId: req.userId });
  res.json(ok(s, "Supplier updated"));
}));

router.delete("/:id", requirePermission("suppliers.delete"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  await svc.deleteSupplier(req.params.id, { userId: req.userId });
  res.json(ok({ deleted: true }, "Supplier deleted"));
}));

export default router;
