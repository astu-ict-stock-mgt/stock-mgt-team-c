import { Router, Response } from "express";
import { ok, paginate } from "../utils/response";
import { asyncHandler, actorOf, requirePermission, AuthedRequest } from "../middleware/auth";
import { qp, qpPage, qpLimit } from "../utils/query";
import * as svc from "../services/dispositions";
import * as val from "../validators";

/**
 * One router serves both /damaged and /obsolete — the two tables are
 * field-identical, so app.ts mounts this factory twice with a different kind and
 * permission. See services/dispositions.ts for the lifecycle.
 */
export function dispositionRouter(kind: svc.DispositionKind, permission: string) {
  const router = Router();

  router.get("/", requirePermission(permission), asyncHandler(async (req: AuthedRequest, res: Response) => {
    const params = {
      page: qpPage(req), limit: qpLimit(req, 20),
      search: qp(req, "search"), itemId: qp(req, "itemId"),
      storeId: qp(req, "storeId"), status: qp(req, "status"),
    };
    const result = await svc.listDispositions(kind, params);
    res.json(ok(paginate(result.items, result.total, params.page, params.limit)));
  }));

  router.post("/", requirePermission(permission), asyncHandler(async (req: AuthedRequest, res: Response) => {
    const body = val.dispositionSchema.parse(req.body);
    const row = await svc.reportDisposition(kind, { ...body, reportedById: req.userId! }, actorOf(req));
    res.status(201).json(ok(row, `Reported as ${kind}`));
  }));

  router.get("/:id", requirePermission(permission), asyncHandler(async (req: AuthedRequest, res: Response) => {
    res.json(ok(await svc.getDisposition(kind, req.params.id)));
  }));

  router.post("/:id/approve", requirePermission(permission), asyncHandler(async (req: AuthedRequest, res: Response) => {
    const row = await svc.approveDisposition(kind, req.params.id, req.userId!, actorOf(req));
    res.json(ok(row, "Disposal approved"));
  }));

  // The only step that removes stock.
  router.post("/:id/dispose", requirePermission(permission), asyncHandler(async (req: AuthedRequest, res: Response) => {
    const body = val.disposalSchema.parse(req.body);
    const row = await svc.disposeDisposition(kind, req.params.id, { ...body, disposedById: req.userId! }, actorOf(req));
    res.json(ok(row, "Goods disposed and removed from stock"));
  }));

  router.post("/:id/cancel", requirePermission(permission), asyncHandler(async (req: AuthedRequest, res: Response) => {
    const row = await svc.cancelDisposition(kind, req.params.id, actorOf(req));
    res.json(ok(row, "Record cancelled"));
  }));

  return router;
}
