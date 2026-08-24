import { Router, Response } from "express";
import { ok } from "../utils/response";
import { asyncHandler, AuthedRequest, requirePermission } from "../middleware/auth";
import { 
  createReturn, getReturn, listReturns, submitReturn,
  evaluateReturn, approveReturn, rejectReturn, receiveReturn
} from "../services/returns";
import { 
  CreateReturnSchema, EvaluateReturnSchema, ReceiveReturnSchema 
} from "../validators/returns";

const router = Router();

router.get("/", requirePermission("returns.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const returns = await listReturns({
    storeId: req.query.storeId as string,
    status: req.query.status as any,
  });
  res.json(ok(returns));
}));

router.get("/:id", requirePermission("returns.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const srn = await getReturn(req.params.id);
  res.json(ok(srn));
}));

router.post("/", requirePermission("returns.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = CreateReturnSchema.parse(req.body);
  const srn = await createReturn(data, { userId: req.userId, ipAddress: req.ip });
  res.status(201).json(ok(srn));
}));

router.post("/:id/submit", requirePermission("returns.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const srn = await submitReturn(req.params.id, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(srn));
}));

router.post("/:id/evaluate", requirePermission("returns.evaluate"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = EvaluateReturnSchema.parse(req.body);
  const srn = await evaluateReturn(req.params.id, data, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(srn));
}));

router.post("/:id/approve", requirePermission("returns.approve"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const srn = await approveReturn(req.params.id, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(srn));
}));

router.post("/:id/reject", requirePermission("returns.approve"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const srn = await rejectReturn(req.params.id, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(srn));
}));

router.post("/:id/receive", requirePermission("returns.receive"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = ReceiveReturnSchema.parse(req.body);
  const srn = await receiveReturn(req.params.id, data, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(srn));
}));

export default router;
