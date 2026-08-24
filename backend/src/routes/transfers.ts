import { Router, Response } from "express";
import { ok } from "../utils/response";
import { asyncHandler, AuthedRequest, requirePermission } from "../middleware/auth";
import { Errors } from "../utils/errors";
import { prisma } from "../config/db";
import { 
  createTransfer, submitTransfer, approveTransfer, rejectTransfer, 
  dispatchTransfer, receiveTransfer 
} from "../services/transfers";
import { 
  CreateTransferSchema, DispatchTransferSchema, ReceiveTransferSchema 
} from "../validators/transfers";

const router = Router();

router.get("/", requirePermission("transfers.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const transfers = await prisma.transferRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      fromStore: true,
      toStore: true,
      requestedBy: { select: { id: true, fullName: true } }
    }
  });
  res.json(ok(transfers));
}));

router.get("/:id", requirePermission("transfers.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const trf = await prisma.transferRequest.findUnique({
    where: { id: req.params.id },
    include: {
      items: { include: { item: true, outAllocations: true, inAllocations: true } },
      fromStore: true,
      toStore: true,
      requestedBy: { select: { id: true, fullName: true } }
    }
  });
  if (!trf) throw Errors.notFound("TransferRequest", req.params.id);
  res.json(ok(trf));
}));

router.post("/", requirePermission("transfers.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = CreateTransferSchema.parse(req.body);
  const trf = await createTransfer(data, { userId: req.userId, ipAddress: req.ip });
  res.status(201).json(ok(trf));
}));

router.post("/:id/submit", requirePermission("transfers.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const trf = await submitTransfer(req.params.id, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(trf));
}));

router.post("/:id/approve", requirePermission("transfers.approve"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const trf = await approveTransfer(req.params.id, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(trf));
}));

router.post("/:id/reject", requirePermission("transfers.approve"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const trf = await rejectTransfer(req.params.id, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(trf));
}));

router.post("/:id/dispatch", requirePermission("transfers.dispatch"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = DispatchTransferSchema.parse(req.body);
  const trf = await dispatchTransfer(req.params.id, data, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(trf));
}));

router.post("/:id/receive", requirePermission("transfers.receive"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = ReceiveTransferSchema.parse(req.body);
  const trf = await receiveTransfer(req.params.id, data, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(trf));
}));

export default router;
