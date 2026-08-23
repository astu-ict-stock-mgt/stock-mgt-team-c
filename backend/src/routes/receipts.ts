import { Router, Response } from "express";
import { ok, fail } from "../utils/response";
import { asyncHandler, AuthedRequest, requirePermission } from "../middleware/auth";
import { 
  createReceipt, submitReceipt, updateReceipt, listReceipts, getReceipt 
} from "../services/receipts";
import { submitEvaluation } from "../services/evaluation";
import { generateGRN } from "../services/grn";
import { 
  CreateGoodsReceiptSchema, UpdateGoodsReceiptSchema, 
  SubmitEvaluationSchema, GenerateGRNSchema 
} from "../validators/receipts";

const router = Router();
console.log("RECEIPTS ROUTER INITIALIZED");

// ==========================================
// Goods Receipts
// ==========================================

router.get("/", requirePermission("goods_receipts.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const receipts = await listReceipts({
    status: req.query.status as string,
    storeId: req.query.storeId as string,
    supplierId: req.query.supplierId as string,
    search: req.query.search as string
  });
  res.json(ok(receipts));
}));

router.post("/", requirePermission("goods_receipts.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = CreateGoodsReceiptSchema.parse(req.body);
  const receipt = await createReceipt(data, { userId: req.userId, ipAddress: req.ip });
  res.status(201).json(ok(receipt));
}));

router.get("/:id", requirePermission("goods_receipts.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const receipt = await getReceipt(req.params.id);
  res.json(ok(receipt));
}));

router.patch("/:id", requirePermission("goods_receipts.update"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = UpdateGoodsReceiptSchema.parse(req.body);
  const receipt = await updateReceipt(req.params.id, data, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(receipt));
}));

router.post("/:id/submit", requirePermission("goods_receipts.submit"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const receipt = await submitReceipt(req.params.id, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(receipt));
}));

// ==========================================
// Technical Evaluations
// ==========================================

router.post("/:id/evaluation", requirePermission("technical_evaluations.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = SubmitEvaluationSchema.parse(req.body);
  const evaluation = await submitEvaluation(req.params.id, data, { userId: req.userId, ipAddress: req.ip });
  res.status(201).json(ok(evaluation));
}));

// ==========================================
// GRN
// ==========================================

router.post("/:id/grn", requirePermission("grns.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = GenerateGRNSchema.parse(req.body);
  const grn = await generateGRN(req.params.id, data.notes, { userId: req.userId, ipAddress: req.ip });
  res.status(201).json(ok(grn));
}));

export default router;
