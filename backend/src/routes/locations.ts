import { Router, Response } from "express";
import { ok } from "../utils/response";
import { asyncHandler, requirePermission, AuthedRequest } from "../middleware/auth";
import * as svc from "../services/stores";
import * as val from "../validators/stores";

const router = Router();

router.get("/:id", requirePermission("locations.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const loc = await svc.getLocation(req.params.id);
  res.json(ok(loc));
}));

router.patch("/:id", requirePermission("locations.update"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.locationSchema.partial().parse(req.body);
  const loc = await svc.updateLocation(req.params.id, body, { userId: req.userId, ip: req.ip });
  res.json(ok(loc, "Location updated"));
}));

router.delete("/:id", requirePermission("locations.delete"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  await svc.deleteLocation(req.params.id, { userId: req.userId, ip: req.ip });
  res.json(ok({ deleted: true }, "Location deleted"));
}));

// Nested Shelves
router.get("/:locationId/shelves", requirePermission("shelves.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const items = await svc.listShelves(req.params.locationId);
  res.json(ok({ items }));
}));

router.post("/:locationId/shelves", requirePermission("shelves.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.shelfSchema.parse(req.body);
  const shelf = await svc.createShelf(req.params.locationId, body, { userId: req.userId, ip: req.ip });
  res.status(201).json(ok(shelf, "Shelf created"));
}));

export default router;
