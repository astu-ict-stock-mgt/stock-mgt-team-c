import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { recordAudit, AuditContext } from "./audit";
import { computeStockValue } from "./fifo";
import { refreshItemStatus } from "./item-status";

export async function listCategories() {
  const items = await prisma.category.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { items: true } } } });
  return items.map((c) => ({ id: c.id, code: c.code, name: c.name, description: c.description, parentId: c.parentId, itemCount: c._count.items }));
}

export async function createCategory(input: any, auditCtx?: AuditContext) {
  const c = await prisma.category.create({ data: { code: input.code.toUpperCase(), name: input.name, description: input.description ?? null } });
  await recordAudit({ ctx: auditCtx, action: "CATEGORY_CREATED", module: "categories", entity: "category", entityId: c.id, newValue: c });
  return c;
}

export async function updateCategory(id: string, input: any, auditCtx?: AuditContext) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw Errors.notFound("Category", id);

  const data: Prisma.CategoryUpdateInput = {};
  if (input.code !== undefined) data.code = input.code.toUpperCase();
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.parentId !== undefined) {
    // A category that is its own ancestor would make the tree walk in
    // listCategories loop forever.
    if (input.parentId === id) throw Errors.conflict("A category cannot be its own parent");
    if (input.parentId && (await isDescendantCategory(input.parentId, id))) {
      throw Errors.conflict("That parent is already below this category");
    }
    data.parent = input.parentId ? { connect: { id: input.parentId } } : { disconnect: true };
  }

  const c = await prisma.category.update({ where: { id }, data });
  await recordAudit({ ctx: auditCtx, action: "CATEGORY_UPDATED", module: "categories", entity: "category", entityId: id, oldValue: existing, newValue: input });
  return c;
}

// Walks up from `startId` looking for `ancestorId`.
async function isDescendantCategory(startId: string, ancestorId: string): Promise<boolean> {
  let cursor: string | null = startId;
  const seen = new Set<string>();
  while (cursor && !seen.has(cursor)) {
    if (cursor === ancestorId) return true;
    seen.add(cursor);
    const row: { parentId: string | null } | null = await prisma.category.findUnique({
      where: { id: cursor }, select: { parentId: true },
    });
    cursor = row?.parentId ?? null;
  }
  return false;
}

export async function deleteCategory(id: string, auditCtx?: AuditContext) {
  const existing = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { items: true, children: true } } },
  });
  if (!existing) throw Errors.notFound("Category", id);
  // Category has no deletedAt column, so this is a hard delete — refuse while
  // anything still points at it rather than orphaning items.
  if (existing._count.items > 0) {
    throw Errors.conflict(`Cannot delete ${existing.name} — ${existing._count.items} item(s) still use it`);
  }
  if (existing._count.children > 0) {
    throw Errors.conflict(`Cannot delete ${existing.name} — it has ${existing._count.children} sub-categor(y/ies)`);
  }

  await prisma.category.delete({ where: { id } });
  await recordAudit({ ctx: auditCtx, action: "CATEGORY_DELETED", module: "categories", entity: "category", entityId: id, oldValue: { code: existing.code, name: existing.name } });
  return true;
}

export async function listUoms() {
  const rows = await prisma.unitOfMeasure.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } } },
  });
  return rows.map((u) => ({ id: u.id, code: u.code, name: u.name, itemCount: u._count.items }));
}

export async function createUom(input: { code: string; name: string }, auditCtx?: AuditContext) {
  const u = await prisma.unitOfMeasure.create({
    data: { code: input.code.toUpperCase(), name: input.name },
  });
  await recordAudit({ ctx: auditCtx, action: "UOM_CREATED", module: "uoms", entity: "uom", entityId: u.id, newValue: u });
  return u;
}

export async function updateUom(id: string, input: { code?: string; name?: string }, auditCtx?: AuditContext) {
  const existing = await prisma.unitOfMeasure.findUnique({ where: { id } });
  if (!existing) throw Errors.notFound("Unit of measure", id);
  const u = await prisma.unitOfMeasure.update({
    where: { id },
    data: {
      ...(input.code !== undefined ? { code: input.code.toUpperCase() } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
    },
  });
  await recordAudit({ ctx: auditCtx, action: "UOM_UPDATED", module: "uoms", entity: "uom", entityId: id, oldValue: existing, newValue: input });
  return u;
}

export async function deleteUom(id: string, auditCtx?: AuditContext) {
  const existing = await prisma.unitOfMeasure.findUnique({
    where: { id }, include: { _count: { select: { items: true } } },
  });
  if (!existing) throw Errors.notFound("Unit of measure", id);
  // uomId on InventoryItem is required, so a used unit can never be removed.
  if (existing._count.items > 0) {
    throw Errors.conflict(`Cannot delete ${existing.code} — ${existing._count.items} item(s) are measured in it`);
  }
  await prisma.unitOfMeasure.delete({ where: { id } });
  await recordAudit({ ctx: auditCtx, action: "UOM_DELETED", module: "uoms", entity: "uom", entityId: id, oldValue: { code: existing.code, name: existing.name } });
  return true;
}

export async function listStores() {
  const items = await prisma.store.findMany({
    where: { deletedAt: null }, orderBy: { name: "asc" },
    include: { stock: { select: { quantity: true } }, _count: { select: { stock: true } } },
  });
  return items.map((w) => ({
    id: w.id, code: w.code, name: w.name, location: w.location, status: w.status,
    itemCount: w._count.stock, totalUnits: w.stock.reduce((s, x) => s + x.quantity, 0),
  }));
}

export async function createStore(input: any, auditCtx?: AuditContext) {
  const w = await prisma.store.create({ data: { code: input.code.toUpperCase(), name: input.name, location: input.location ?? null } });
  await recordAudit({ ctx: auditCtx, action: "STORE_CREATED", module: "stores", entity: "store", entityId: w.id, newValue: w });
  return w;
}

export async function updateStore(id: string, input: any, auditCtx?: AuditContext) {
  const existing = await prisma.store.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw Errors.notFound("Store", id);

  const data: Prisma.StoreUpdateInput = {};
  if (input.code !== undefined) data.code = input.code.toUpperCase();
  if (input.name !== undefined) data.name = input.name;
  if (input.location !== undefined) data.location = input.location;
  if (input.status !== undefined) data.status = input.status;

  const w = await prisma.store.update({ where: { id }, data });
  await recordAudit({ ctx: auditCtx, action: "STORE_UPDATED", module: "stores", entity: "store", entityId: id, oldValue: existing, newValue: input });
  return w;
}

export async function deleteStore(id: string, auditCtx?: AuditContext) {
  const existing = await prisma.store.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw Errors.notFound("Store", id);

  // Closing a store that still physically holds goods would strand them: the
  // stock stays on the books but no screen offers the store any more.
  const onHand = await prisma.storeStock.aggregate({
    where: { storeId: id }, _sum: { quantity: true },
  });
  const remaining = onHand._sum.quantity ?? 0;
  if (remaining > 0) {
    throw Errors.conflict(`Cannot delete ${existing.name} — it still holds ${remaining} unit(s). Transfer them out first`);
  }

  await prisma.store.update({ where: { id }, data: { deletedAt: new Date(), status: "INACTIVE" } });
  await recordAudit({ ctx: auditCtx, action: "STORE_DELETED", module: "stores", entity: "store", entityId: id, oldValue: { code: existing.code, name: existing.name } });
  return true;
}

export async function listInventory(params: { page: number; limit: number; search?: string; categoryId?: string; status?: string }) {
  const where: Prisma.InventoryItemWhereInput = { deletedAt: null };
  if (params.search) where.OR = [{ code: { contains: params.search } }, { name: { contains: params.search } }];
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.status) where.status = params.status as any;

  const [total, rows] = await Promise.all([
    prisma.inventoryItem.count({ where }),
    prisma.inventoryItem.findMany({
      where, orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit, take: params.limit,
      include: { category: true, uom: true },
    }),
  ]);

  const items = [];
  for (const it of rows) {
    const val = await computeStockValue(it.id);
    items.push({
      id: it.id, code: it.code, name: it.name, description: it.description, status: it.status,
      minStock: it.minStock, maxStock: it.maxStock, safetyStock: it.safetyStock, reorderLevel: it.reorderLevel,
      unitCost: val.avgUnitCost || it.unitCost,
      category: { id: it.category.id, name: it.category.name },
      uom: { id: it.uom.id, code: it.uom.code, name: it.uom.name },
      totalQuantity: val.quantity, totalValue: val.value,
    });
  }
  return { total, items };
}

export async function getInventoryItem(id: string) {
  const it = await prisma.inventoryItem.findFirst({
    where: { id, deletedAt: null },
    include: { category: true, uom: true, storeStock: { include: { store: true } } },
  });
  if (!it) throw Errors.notFound("Inventory item", id);
  const val = await computeStockValue(it.id);
  const recentTx = await prisma.stockTransaction.findMany({
    where: { itemId: id }, orderBy: { transactionDate: "desc" }, take: 20,
    include: { user: true, store: true },
  });
  return {
    id: it.id, code: it.code, name: it.name, description: it.description, status: it.status,
    minStock: it.minStock, maxStock: it.maxStock, safetyStock: it.safetyStock, reorderLevel: it.reorderLevel,
    unitCost: val.avgUnitCost || it.unitCost, category: it.category, uom: it.uom,
    storeStock: it.storeStock.map((ws) => ({
      id: ws.id, storeId: ws.storeId, storeCode: ws.store.code, storeName: ws.store.name,
      quantity: ws.quantity, reservedQty: ws.reservedQty,
    })),
    totalQuantity: val.quantity, totalValue: val.value, avgUnitCost: val.avgUnitCost, fifoLayers: val.layers,
    recentTransactions: recentTx.map((t) => ({
      id: t.id, code: t.code, type: t.type, quantity: t.quantity, unitCost: t.unitCost,
      balanceAfter: t.balanceAfter, referenceType: t.referenceType, referenceId: t.referenceId,
      remarks: t.remarks, transactionDate: t.transactionDate.toISOString(),
      user: t.user?.fullName ?? null, store: t.store?.code ?? null,
    })),
  };
}

export async function createInventoryItem(input: any, auditCtx?: AuditContext) {
  const dup = await prisma.inventoryItem.findFirst({ where: { code: input.code.toUpperCase() } });
  if (dup) throw Errors.duplicateItemCode();
  const it = await prisma.inventoryItem.create({
    data: {
      code: input.code.toUpperCase(), name: input.name, description: input.description ?? null,
      categoryId: input.categoryId, uomId: input.uomId,
      minStock: input.minStock ?? 0, maxStock: input.maxStock ?? 0,
      safetyStock: input.safetyStock ?? 0, reorderLevel: input.reorderLevel ?? 0,
    },
    include: { category: true, uom: true },
  });
  await recordAudit({ ctx: auditCtx, action: "ITEM_CREATED", module: "inventory", entity: "item", entityId: it.id, newValue: { code: it.code, name: it.name } });
  return it;
}

export async function updateInventoryItem(id: string, input: any, auditCtx?: AuditContext) {
  const existing = await prisma.inventoryItem.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw Errors.notFound("Inventory item", id);
  const it = await prisma.inventoryItem.update({ where: { id }, data: input, include: { category: true, uom: true } });
  // Editing reorderLevel moves the low-stock threshold, so the derived status
  // has to be recomputed even though no stock moved.
  if (input.reorderLevel !== undefined) await refreshItemStatus(prisma, id);
  await recordAudit({ ctx: auditCtx, action: "ITEM_UPDATED", module: "inventory", entity: "item", entityId: id, oldValue: existing, newValue: input });
  return it;
}

export async function deleteInventoryItem(id: string, auditCtx?: AuditContext) {
  const existing = await prisma.inventoryItem.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw Errors.notFound("Inventory item", id);
  await prisma.inventoryItem.update({ where: { id }, data: { deletedAt: new Date(), status: "DISPOSED" } });
  await recordAudit({ ctx: auditCtx, action: "ITEM_DELETED", module: "inventory", entity: "item", entityId: id });
  return true;
}
