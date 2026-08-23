import { Router, Response } from "express";
import { ok } from "../utils/response";
import { asyncHandler, requirePermission, AuthedRequest } from "../middleware/auth";
import { qp } from "../utils/query";
import * as svc from "../services/stores";
import * as val from "../validators/stores";

const router = Router();

router.get("/", requirePermission("stores.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const search = qp(req, "search");
  const status = qp(req, "status");
  const items = await svc.listStores({ search, status });
  res.json(ok({ items }));
}));

router.post("/", requirePermission("stores.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.storeSchema.parse(req.body);
  const store = await svc.createStore(body, { userId: req.userId, ip: req.ip });
  res.status(201).json(ok(store, "Store created"));
}));

router.get("/:id", requirePermission("stores.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const store = await svc.getStore(req.params.id);
  res.json(ok(store));
}));

router.patch("/:id", requirePermission("stores.update"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.storeSchema.partial().parse(req.body);
  const store = await svc.updateStore(req.params.id, body, { userId: req.userId, ip: req.ip });
  res.json(ok(store, "Store updated"));
}));

router.delete("/:id", requirePermission("stores.delete"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  await svc.deleteStore(req.params.id, { userId: req.userId, ip: req.ip });
  res.json(ok({ deleted: true }, "Store deleted/deactivated"));
}));

// Nested Locations
router.get("/:storeId/locations", requirePermission("locations.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const items = await svc.listLocations(req.params.storeId);
  res.json(ok({ items }));
}));

router.post("/:storeId/locations", requirePermission("locations.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.locationSchema.parse(req.body);
  const loc = await svc.createLocation(req.params.storeId, body, { userId: req.userId, ip: req.ip });
  res.status(201).json(ok(loc, "Location created"));
}));

export default router;
