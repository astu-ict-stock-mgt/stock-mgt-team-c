// @ts-nocheck
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { Errors } from "@/lib/utils/errors";
import { recordAudit } from "@/lib/services/audit";
import { computeStockValue } from "@/lib/services/fifo";

export async function listCategories() {
  const items = await db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } } },
  });
  return items.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    description: c.description,
    parentId: c.parentId,
    itemCount: c._count.items,
  }));
}

export async function createCategory(input: { code: string; name: string; description?: string; parentId?: string }, auditCtx?: { userId?: string }) {
  const c = await db.category.create({
    data: {
      code: input.code.toUpperCase(),
      name: input.name,
      description: input.description ?? null,
      parentId: input.parentId ?? null,
    },
  });
  await recordAudit({ ctx: { userId: auditCtx?.userId }, action: "CATEGORY_CREATED", module: "categories", entity: "category", entityId: c.id, newValue: c });
  return c;
}

export async function listWarehouses() {
  const items = await db.warehouse.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      stock: { select: { quantity: true } },
      _count: { select: { stock: true } },
    },
  });
  return items.map((w) => ({
    id: w.id,
    code: w.code,
    name: w.name,
    location: w.location,
    status: w.status,
    itemCount: w._count.stock,
    totalUnits: w.stock.reduce((s, x) => s + x.quantity, 0),
  }));
}

export async function createWarehouse(input: { code: string; name: string; location?: string }, auditCtx?: { userId?: string }) {
  const w = await db.warehouse.create({ data: { code: input.code.toUpperCase(), name: input.name, location: input.location ?? null } });
  await recordAudit({ ctx: { userId: auditCtx?.userId }, action: "WAREHOUSE_CREATED", module: "warehouses", entity: "warehouse", entityId: w.id, newValue: w });
  return w;
}

export async function listUoms() {
  return db.unitOfMeasure.findMany({ orderBy: { name: "asc" } });
}

export type InventoryListItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  minStock: number;
  maxStock: number;
  safetyStock: number;
  reorderLevel: number;
  unitCost: number;
  category: { id: string; name: string };
  uom: { id: string; code: string; name: string };
  totalQuantity: number;
  totalValue: number;
};

export async function listInventory(params: {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  status?: string;
}) {
  const where: Prisma.InventoryItemWhereInput = { deletedAt: null };
  if (params.search) {
    where.OR = [
      { code: { contains: params.search } },
      { name: { contains: params.search } },
    ];
  }
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.status) where.status = params.status as any;

  const [total, rows] = await Promise.all([
    db.inventoryItem.count({ where }),
    db.inventoryItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      include: { category: true, uom: true },
    }),
  ]);

  const items: InventoryListItem[] = [];
  for (const it of rows) {
    const val = await computeStockValue(it.id);
    items.push({
      id: it.id,
      code: it.code,
      name: it.name,
      description: it.description,
      status: it.status,
      minStock: it.minStock,
      maxStock: it.maxStock,
      safetyStock: it.safetyStock,
      reorderLevel: it.reorderLevel,
      unitCost: val.avgUnitCost || it.unitCost,
      category: { id: it.category.id, name: it.category.name },
      uom: { id: it.uom.id, code: it.uom.code, name: it.uom.name },
      totalQuantity: val.quantity,
      totalValue: val.value,
    });
  }
  return { total, items };
}

export async function getInventoryItem(id: string) {
  const it = await db.inventoryItem.findFirst({
    where: { id, deletedAt: null },
    include: {
      category: true,
      uom: true,
      warehouseStock: { include: { warehouse: true } },
    },
  });
  if (!it) throw Errors.notFound("Inventory item", id);

  const val = await computeStockValue(it.id);
  const recentTx = await db.stockTransaction.findMany({
    where: { itemId: id },
    orderBy: { transactionDate: "desc" },
    take: 20,
    include: { user: true, warehouse: true },
  });

  return {
    id: it.id,
    code: it.code,
    name: it.name,
    description: it.description,
    status: it.status,
    minStock: it.minStock,
    maxStock: it.maxStock,
    safetyStock: it.safetyStock,
    reorderLevel: it.reorderLevel,
    unitCost: val.avgUnitCost || it.unitCost,
    category: it.category,
    uom: it.uom,
    warehouseStock: it.warehouseStock.map((ws) => ({
      id: ws.id,
      warehouseId: ws.warehouseId,
      warehouseCode: ws.warehouse.code,
      warehouseName: ws.warehouse.name,
      quantity: ws.quantity,
      reservedQty: ws.reservedQty,
    })),
    totalQuantity: val.quantity,
    totalValue: val.value,
    avgUnitCost: val.avgUnitCost,
    fifoLayers: val.layers,
    recentTransactions: recentTx.map((t) => ({
      id: t.id,
      code: t.code,
      type: t.type,
      quantity: t.quantity,
      unitCost: t.unitCost,
      balanceAfter: t.balanceAfter,
      referenceType: t.referenceType,
      referenceId: t.referenceId,
      remarks: t.remarks,
      transactionDate: t.transactionDate.toISOString(),
      user: t.user?.fullName ?? null,
      warehouse: t.warehouse?.code ?? null,
    })),
  };
}

export async function createInventoryItem(input: {
  code: string;
  name: string;
  description?: string;
  categoryId: string;
  uomId: string;
  minStock?: number;
  maxStock?: number;
  safetyStock?: number;
  reorderLevel?: number;
}, auditCtx?: { userId?: string }) {
  const dup = await db.inventoryItem.findFirst({ where: { code: input.code.toUpperCase() } });
  if (dup) throw Errors.duplicateItemCode();

  const it = await db.inventoryItem.create({
    data: {
      code: input.code.toUpperCase(),
      name: input.name,
      description: input.description ?? null,
      categoryId: input.categoryId,
      uomId: input.uomId,
      minStock: input.minStock ?? 0,
      maxStock: input.maxStock ?? 0,
      safetyStock: input.safetyStock ?? 0,
      reorderLevel: input.reorderLevel ?? 0,
    },
    include: { category: true, uom: true },
  });
  await recordAudit({ ctx: { userId: auditCtx?.userId }, action: "ITEM_CREATED", module: "inventory", entity: "item", entityId: it.id, newValue: { code: it.code, name: it.name } });
  return it;
}

export async function updateInventoryItem(id: string, input: Partial<{
  name: string;
  description: string | null;
  categoryId: string;
  uomId: string;
  minStock: number;
  maxStock: number;
  safetyStock: number;
  reorderLevel: number;
  status: "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK" | "DAMAGED" | "OBSOLETE" | "DISPOSED";
}>, auditCtx?: { userId?: string }) {
  const existing = await db.inventoryItem.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw Errors.notFound("Inventory item", id);
  const it = await db.inventoryItem.update({ where: { id }, data: input, include: { category: true, uom: true } });
  await recordAudit({ ctx: { userId: auditCtx?.userId }, action: "ITEM_UPDATED", module: "inventory", entity: "item", entityId: id, oldValue: existing, newValue: input });
  return it;
}

export async function deleteInventoryItem(id: string, auditCtx?: { userId?: string }) {
  const existing = await db.inventoryItem.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw Errors.notFound("Inventory item", id);
  await db.inventoryItem.update({ where: { id }, data: { deletedAt: new Date(), status: "DISPOSED" } });
  await recordAudit({ ctx: { userId: auditCtx?.userId }, action: "ITEM_DELETED", module: "inventory", entity: "item", entityId: id });
  return true;
}

