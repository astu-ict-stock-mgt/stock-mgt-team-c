import { Router, Response } from "express";
import { ok } from "../utils/response";
import { asyncHandler, requirePermission, AuthedRequest } from "../middleware/auth";
import * as svc from "../services/stores";
import * as val from "../validators/stores";

const router = Router();

router.get("/:id", requirePermission("shelves.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const shelf = await svc.getShelf(req.params.id);
  res.json(ok(shelf));
}));

router.patch("/:id", requirePermission("shelves.update"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.shelfSchema.partial().parse(req.body);
  const shelf = await svc.updateShelf(req.params.id, body, { userId: req.userId, ip: req.ip });
  res.json(ok(shelf, "Shelf updated"));
}));

router.delete("/:id", requirePermission("shelves.delete"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  await svc.deleteShelf(req.params.id, { userId: req.userId, ip: req.ip });
  res.json(ok({ deleted: true }, "Shelf deleted"));
}));

// Nested Bins
router.get("/:shelfId/bins", requirePermission("bins.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const items = await svc.listBins(req.params.shelfId);
  res.json(ok({ items }));
}));

router.post("/:shelfId/bins", requirePermission("bins.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.binSchema.parse(req.body);
  const bin = await svc.createBin(req.params.shelfId, body, { userId: req.userId, ip: req.ip });
  res.status(201).json(ok(bin, "Bin created"));
}));

export default router;
