import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { recordAudit } from "./audit";
import { computeStockValue } from "./fifo";
import { refreshItemStatus } from "./item-status";

export async function listCategories() {
  const items = await prisma.category.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { items: true } } } });
  return items.map((c) => ({ id: c.id, code: c.code, name: c.name, description: c.description, parentId: c.parentId, itemCount: c._count.items }));
}

export async function createCategory(input: any, auditCtx?: { userId?: string }) {
  const c = await prisma.category.create({ data: { code: input.code.toUpperCase(), name: input.name, description: input.description ?? null } });
  await recordAudit({ ctx: { userId: auditCtx?.userId }, action: "CATEGORY_CREATED", module: "categories", entity: "category", entityId: c.id, newValue: c });
  return c;
}

export async function listUoms() {
  return prisma.unitOfMeasure.findMany({ orderBy: { name: "asc" } });
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

export async function createStore(input: any, auditCtx?: { userId?: string }) {
  const w = await prisma.store.create({ data: { code: input.code.toUpperCase(), name: input.name, location: input.location ?? null } });
  await recordAudit({ ctx: { userId: auditCtx?.userId }, action: "STORE_CREATED", module: "stores", entity: "store", entityId: w.id, newValue: w });
  return w;
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

export async function createInventoryItem(input: any, auditCtx?: { userId?: string }) {
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
  await recordAudit({ ctx: { userId: auditCtx?.userId }, action: "ITEM_CREATED", module: "inventory", entity: "item", entityId: it.id, newValue: { code: it.code, name: it.name } });
  return it;
}

export async function updateInventoryItem(id: string, input: any, auditCtx?: { userId?: string }) {
  const existing = await prisma.inventoryItem.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw Errors.notFound("Inventory item", id);
  const it = await prisma.inventoryItem.update({ where: { id }, data: input, include: { category: true, uom: true } });
  // Editing reorderLevel moves the low-stock threshold, so the derived status
  // has to be recomputed even though no stock moved.
  if (input.reorderLevel !== undefined) await refreshItemStatus(prisma, id);
  await recordAudit({ ctx: { userId: auditCtx?.userId }, action: "ITEM_UPDATED", module: "inventory", entity: "item", entityId: id, oldValue: existing, newValue: input });
  return it;
}

export async function deleteInventoryItem(id: string, auditCtx?: { userId?: string }) {
  const existing = await prisma.inventoryItem.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw Errors.notFound("Inventory item", id);
  await prisma.inventoryItem.update({ where: { id }, data: { deletedAt: new Date(), status: "DISPOSED" } });
  await recordAudit({ ctx: { userId: auditCtx?.userId }, action: "ITEM_DELETED", module: "inventory", entity: "item", entityId: id });
  return true;
}
