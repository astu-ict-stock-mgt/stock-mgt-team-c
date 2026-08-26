import { Router, Response } from "express";
import { ok, paginate } from "../utils/response";
import { asyncHandler, actorOf, requirePermission, AuthedRequest } from "../middleware/auth";
import { qp, qpPage, qpLimit } from "../utils/query";
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
  const c = await inv.createCategory(body, actorOf(req));
  res.status(201).json(ok(c, "Category created"));
}));

router.patch("/categories/:id", requirePermission("categories.update"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.categoryUpdateSchema.parse(req.body);
  const c = await inv.updateCategory(req.params.id, body, actorOf(req));
  res.json(ok(c, "Category updated"));
}));

router.delete("/categories/:id", requirePermission("categories.delete"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  await inv.deleteCategory(req.params.id, actorOf(req));
  res.json(ok({ deleted: true }, "Category deleted"));
}));

// Units of measure — previously only creatable by the seed script.
router.get("/uoms", requirePermission("categories.read"), asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const items = await inv.listUoms();
  res.json(ok({ items }));
}));

router.post("/uoms", requirePermission("categories.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.uomSchema.parse(req.body);
  const u = await inv.createUom(body, actorOf(req));
  res.status(201).json(ok(u, "Unit of measure created"));
}));

router.patch("/uoms/:id", requirePermission("categories.update"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.uomSchema.partial().parse(req.body);
  const u = await inv.updateUom(req.params.id, body, actorOf(req));
  res.json(ok(u, "Unit of measure updated"));
}));

router.delete("/uoms/:id", requirePermission("categories.delete"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  await inv.deleteUom(req.params.id, actorOf(req));
  res.json(ok({ deleted: true }, "Unit of measure deleted"));
}));

// Stores
router.get("/stores", requirePermission("warehouses.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const items = await inv.listStores();
  res.json(ok({ items }));
}));

router.post("/stores", requirePermission("warehouses.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.storeSchema.parse(req.body);
  const w = await inv.createStore(body, actorOf(req));
  res.status(201).json(ok(w, "Store created"));
}));

router.patch("/stores/:id", requirePermission("warehouses.update"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.storeUpdateSchema.parse(req.body);
  const w = await inv.updateStore(req.params.id, body, actorOf(req));
  res.json(ok(w, "Store updated"));
}));

router.delete("/stores/:id", requirePermission("warehouses.delete"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  await inv.deleteStore(req.params.id, actorOf(req));
  res.json(ok({ deleted: true }, "Store deleted"));
}));

// Inventory items
router.get("/inventory", requirePermission("inventory.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const params = {
    page: qpPage(req), limit: qpLimit(req, 20),
    search: qp(req, "search"), categoryId: qp(req, "categoryId"), status: qp(req, "status"),
  };
  const result = await inv.listInventory(params);
  res.json(ok(paginate(result.items, result.total, params.page, params.limit)));
}));

router.post("/inventory", requirePermission("inventory.create"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.itemSchema.parse(req.body);
  const it = await inv.createInventoryItem(body, actorOf(req));
  res.status(201).json(ok(it, "Item created"));
}));

router.get("/inventory/:id", requirePermission("inventory.read"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const item = await inv.getInventoryItem(req.params.id);
  res.json(ok(item));
}));

router.patch("/inventory/:id", requirePermission("inventory.update"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = val.itemSchema.partial().parse(req.body);
  const it = await inv.updateInventoryItem(req.params.id, body, actorOf(req));
  res.json(ok(it, "Item updated"));
}));

router.delete("/inventory/:id", requirePermission("inventory.delete"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  await inv.deleteInventoryItem(req.params.id, actorOf(req));
  res.json(ok({ deleted: true }, "Item deleted"));
}));

export default router;
