import { Router, Response } from "express";
import { ok, paginate } from "../utils/response";
import { asyncHandler, actorOf, requirePermission, AuthedRequest } from "../middleware/auth";
import { qp, qpPage, qpLimit } from "../utils/query";
import * as svc from "../services/stocktakes";
import * as val from "../validators";

const router = Router();

router.get("/", requirePermission("stocktake.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const params = {
    page: qpPage(req), limit: qpLimit(req, 20),
    search: qp(req, "search"), storeId: qp(req, "storeId"), status: qp(req, "status"),
  };
  const result = await svc.listStockTakes(params);
  res.json(ok(paginate(result.items, result.total, params.page, params.limit)));
}));

router.post("/", requirePermission("stocktake.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.stockTakeSchema.parse(req.body);
  const take = await svc.createStockTake({ ...body, conductedById: req.userId! }, actorOf(req));
  res.status(201).json(ok(take, "Stock take opened"));
}));

router.get("/:id", requirePermission("stocktake.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  res.json(ok(await svc.getStockTake(req.params.id)));
}));

router.patch("/:id/counts", requirePermission("stocktake.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.stockTakeCountsSchema.parse(req.body);
  const take = await svc.recordCounts(req.params.id, body, actorOf(req));
  res.json(ok(take, "Counts recorded"));
}));

router.post("/:id/complete", requirePermission("stocktake.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const take = await svc.completeStockTake(req.params.id, actorOf(req));
  res.json(ok(take, "Stock take completed and ready for reconciliation"));
}));

// Reconciliation is the only step that writes to real stock, so it sits behind the
// separate stocktake.approve permission rather than stocktake.create.
router.post("/:id/reconcile", requirePermission("stocktake.approve"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const take = await svc.reconcileStockTake(req.params.id, req.userId!, actorOf(req));
  res.json(ok(take, "Stock take reconciled — inventory now matches the physical count"));
}));

router.delete("/:id", requirePermission("stocktake.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const result = await svc.deleteStockTake(req.params.id, actorOf(req));
  res.json(ok(result, "Stock take deleted"));
}));

export default router;
