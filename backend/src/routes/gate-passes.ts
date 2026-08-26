import { Router, Response } from "express";
import { ok, paginate } from "../utils/response";
import { asyncHandler, actorOf, requirePermission, AuthedRequest } from "../middleware/auth";
import { qp, qpPage, qpLimit } from "../utils/query";
import { ROLES } from "../constants/roles";
import * as svc from "../services/gate-passes";
import * as val from "../validators";

const router = Router();

router.get("/", requirePermission("gatepass.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const params = {
    page: qpPage(req), limit: qpLimit(req, 20),
    search: qp(req, "search"), status: qp(req, "status"),
    requestedById: qp(req, "requestedById"),
  };
  const result = await svc.listGatePasses(params);
  res.json(ok(paginate(result.items, result.total, params.page, params.limit)));
}));

router.post("/", requirePermission("gatepass.request"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.gatePassSchema.parse(req.body);
  const pass = await svc.requestGatePass({ ...body, requestedById: req.userId! }, actorOf(req));
  res.status(201).json(ok(pass, "Gate pass requested"));
}));

router.get("/:id", requirePermission("gatepass.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  res.json(ok(await svc.getGatePass(req.params.id)));
}));

router.post("/:id/decision", requirePermission("gatepass.approve"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.gatePassDecisionSchema.parse(req.body);
  const pass = await svc.decideGatePass(req.params.id, body, req.userId!, actorOf(req));
  res.json(ok(pass, `Gate pass ${body.decision.toLowerCase()}`));
}));

router.post("/:id/confirm-exit", requirePermission("gatepass.approve"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const pass = await svc.confirmGatePassExit(req.params.id, req.userId!, actorOf(req));
  res.json(ok(pass, "Material exit confirmed"));
}));

// A requester needs no approval permission to withdraw their own pass, so this
// only requires gatepass.read; ownership is checked in the service.
router.post("/:id/cancel", requirePermission("gatepass.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const pass = await svc.cancelGatePass(
    req.params.id, req.userId!, req.roles.has(ROLES.ADMINISTRATOR), actorOf(req)
  );
  res.json(ok(pass, "Gate pass cancelled"));
}));

export default router;
