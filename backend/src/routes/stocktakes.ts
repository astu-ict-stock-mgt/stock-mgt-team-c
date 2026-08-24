import { Router, Response } from "express";
import { ok } from "../utils/response";
import { asyncHandler, AuthedRequest, requirePermission } from "../middleware/auth";
import {
  createStockTake,
  addStockTakeItems,
  listStockTakes,
  getStockTake,
  updateStockTake,
  startStockTake,
  resumeStockTake,
  recordCount,
  submitStockTake,
  reviewStockTake,
  recountStockTake,
  rejectStockTake,
  approveStockTake,
} from "../services/stocktakes";
import {
  CreateStockTakeSchema,
  AddStockTakeItemsSchema,
  RecordCountSchema,
  UpdateStockTakeSchema,
} from "../validators/stocktakes";

const router = Router();

router.get("/", requirePermission("stocktakes.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const items = await listStockTakes({
    storeId: req.query.storeId as string | undefined,
    status: req.query.status as any,
    search: req.query.search as string | undefined,
  });
  res.json(ok({ items }));
}));

router.get("/:id", requirePermission("stocktakes.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const st = await getStockTake(req.params.id);
  res.json(ok(st));
}));

router.post("/", requirePermission("stocktakes.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = CreateStockTakeSchema.parse(req.body);
  const st = await createStockTake(data, { userId: req.userId, ipAddress: req.ip });
  res.status(201).json(ok(st));
}));

router.patch("/:id", requirePermission("stocktakes.update"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = UpdateStockTakeSchema.parse(req.body);
  const st = await updateStockTake(req.params.id, data, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(st));
}));

router.post("/:id/items", requirePermission("stocktakes.update"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = AddStockTakeItemsSchema.parse(req.body);
  const st = await addStockTakeItems(req.params.id, data, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(st));
}));

router.post("/:id/start", requirePermission("stocktakes.update"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const st = await startStockTake(req.params.id, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(st));
}));

router.post("/:id/resume", requirePermission("stocktakes.update"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const st = await resumeStockTake(req.params.id, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(st));
}));

router.patch("/:id/count", requirePermission("stocktakes.update"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = RecordCountSchema.parse(req.body);
  const st = await recordCount(req.params.id, data, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(st));
}));

router.post("/:id/submit", requirePermission("stocktakes.submit"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const st = await submitStockTake(req.params.id, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(st));
}));

router.post("/:id/review", requirePermission("stocktakes.review"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const st = await reviewStockTake(req.params.id, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(st));
}));

router.post("/:id/recount", requirePermission("stocktakes.recount"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const st = await recountStockTake(req.params.id, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(st));
}));

router.post("/:id/reject", requirePermission("stocktakes.review"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const st = await rejectStockTake(req.params.id, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(st));
}));

router.post("/:id/approve", requirePermission("stocktakes.review"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const st = await approveStockTake(req.params.id, { userId: req.userId, ipAddress: req.ip });
  res.json(ok(st));
}));

export default router;
