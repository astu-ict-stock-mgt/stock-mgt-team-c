import { Router, Response } from "express";
import { ok, paginate } from "../utils/response";
import { asyncHandler, requirePermission, AuthedRequest } from "../middleware/auth";
import { qp, qpInt } from "../utils/query";
import * as inv from "../services/inventory";
import * as val from "../validators";

const router = Router();

// Categories + UoMs (combined endpoint)
router.get("/categories", requirePermission("categories.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const [categories, uoms] = await Promise.all([inv.listCategories(), inv.listUoms()]);
  res.json(ok({ categories, uoms }));
}));

router.post("/categories", requirePermission("categories.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.categorySchema.parse(req.body);
  const c = await inv.createCategory(body, { userId: req.userId });
  res.status(201).json(ok(c, "Category created"));
}));

// Stores
router.get("/stores", requirePermission("warehouses.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const items = await inv.listStores();
  res.json(ok({ items }));
}));

router.post("/stores", requirePermission("warehouses.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.storeSchema.parse(req.body);
  const w = await inv.createStore(body, { userId: req.userId });
  res.status(201).json(ok(w, "Store created"));
}));

// Inventory items
router.get("/inventory", requirePermission("inventory.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const params = {
    page: qpInt(req, "page", 1), limit: qpInt(req, "limit", 20),
    search: qp(req, "search"), categoryId: qp(req, "categoryId"), status: qp(req, "status"),
  };
  const result = await inv.listInventory(params);
  res.json(ok(paginate(result.items, result.total, params.page, params.limit)));
}));

router.post("/inventory", requirePermission("inventory.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.itemSchema.parse(req.body);
  const it = await inv.createInventoryItem(body, { userId: req.userId });
  res.status(201).json(ok(it, "Item created"));
}));

router.get("/inventory/:id", requirePermission("inventory.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const item = await inv.getInventoryItem(req.params.id);
  res.json(ok(item));
}));

router.patch("/inventory/:id", requirePermission("inventory.update"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.itemSchema.partial().parse(req.body);
  const it = await inv.updateInventoryItem(req.params.id, body, { userId: req.userId });
  res.json(ok(it, "Item updated"));
}));

router.delete("/inventory/:id", requirePermission("inventory.delete"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  await inv.deleteInventoryItem(req.params.id, { userId: req.userId });
  res.json(ok({ deleted: true }, "Item deleted"));
}));

export default router;
