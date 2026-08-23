import { Router, Response } from "express";
import { ok } from "../utils/response";
import { asyncHandler, AuthedRequest, requirePermission } from "../middleware/auth";
import { 
  listRequisitions, getRequisition, createRequisition, updateRequisition, 
  submitRequisition, getApprovals, approveRequisition, rejectRequisition 
} from "../services/requisitions";
import { 
  CreateRequisitionSchema, UpdateRequisitionSchema, 
  ApproveRequisitionSchema, RejectRequisitionSchema 
} from "../validators/requisitions";

const router = Router();

router.get("/", requirePermission("requisitions.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const reqs = await listRequisitions({
    status: req.query.status as any,
    department: req.query.department as string,
    requestedById: req.query.requestedById as string,
  });
  return ok(res, reqs);
}));

router.get("/:id", requirePermission("requisitions.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const requisition = await getRequisition(req.params.id);
  return ok(res, requisition);
}));

router.post("/", requirePermission("requisitions.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = CreateRequisitionSchema.parse(req.body);
  const requisition = await createRequisition(data, req.auditCtx!);
  return ok(res, requisition, 201);
}));

router.patch("/:id", requirePermission("requisitions.update"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = UpdateRequisitionSchema.parse(req.body);
  const requisition = await updateRequisition(req.params.id, data, req.auditCtx!);
  return ok(res, requisition);
}));

router.post("/:id/submit", requirePermission("requisitions.submit"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const requisition = await submitRequisition(req.params.id, req.auditCtx!);
  return ok(res, requisition);
}));

router.get("/:id/approvals", requirePermission("requisitions.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const approvals = await getApprovals(req.params.id);
  return ok(res, approvals);
}));

router.post("/:id/approve", requirePermission("requisitions.approve"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = ApproveRequisitionSchema.parse(req.body);
  const requisition = await approveRequisition(req.params.id, data, req.auditCtx!);
  return ok(res, requisition);
}));

router.post("/:id/reject", requirePermission("requisitions.reject"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = RejectRequisitionSchema.parse(req.body);
  const requisition = await rejectRequisition(req.params.id, data, req.auditCtx!);
  return ok(res, requisition);
}));

export default router;
