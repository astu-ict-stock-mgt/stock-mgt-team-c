import { Router, Response } from "express";
import { ok } from "../utils/response";
import { asyncHandler, AuthedRequest, requirePermission } from "../middleware/auth";
import { 
  listSIVs, getSIV, createPreliminarySIV, amendSIV, 
  submitSIV, approveSIV, rejectSIV, finalizeSIV 
} from "../services/sivs";
import { 
  CreateSIVSchema, AmendSIVSchema, ApproveSIVSchema, RejectSIVSchema 
} from "../validators/sivs";

const router = Router();

router.get("/", requirePermission("sivs.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const sivs = await listSIVs({
    status: req.query.status as any,
    storeId: req.query.storeId as string,
  });
  return ok(res, sivs);
}));

router.get("/:id", requirePermission("sivs.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const siv = await getSIV(req.params.id);
  return ok(res, siv);
}));

router.post("/", requirePermission("sivs.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = CreateSIVSchema.parse(req.body);
  const siv = await createPreliminarySIV(data, req.auditCtx!);
  return ok(res, siv, 201);
}));

router.patch("/:id", requirePermission("sivs.amend"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = AmendSIVSchema.parse(req.body);
  const siv = await amendSIV(req.params.id, data, req.auditCtx!);
  return ok(res, siv);
}));

router.post("/:id/submit", requirePermission("sivs.submit"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const siv = await submitSIV(req.params.id, req.auditCtx!);
  return ok(res, siv);
}));

router.post("/:id/approve", requirePermission("sivs.approve"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const siv = await approveSIV(req.params.id, req.auditCtx!);
  return ok(res, siv);
}));

router.post("/:id/request-amendment", requirePermission("sivs.amend"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  // Can just reject or revert to PRELIMINARY for amend
  return ok(res, { message: "Use amend endpoint to submit new allocations" });
}));

router.post("/:id/reject", requirePermission("sivs.reject"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = RejectSIVSchema.parse(req.body);
  const siv = await rejectSIV(req.params.id, req.auditCtx!);
  return ok(res, siv);
}));

router.post("/:id/finalize", requirePermission("sivs.finalize"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const siv = await finalizeSIV(req.params.id, req.auditCtx!);
  return ok(res, siv);
}));

export default router;
