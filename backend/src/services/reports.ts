import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { computeStockValue } from "./fifo";

export async function inventoryReport(params: { categoryId?: string; storeId?: string; status?: string; lowStockOnly?: boolean }) {
  const where: Prisma.InventoryItemWhereInput = { deletedAt: null };
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.status) where.status = params.status as any;

  const items = await prisma.inventoryItem.findMany({ where, include: { category: true, uom: true }, orderBy: { code: "asc" } });

  const out = [];
  for (const it of items) {
    const val = await computeStockValue(it.id, params.storeId);
    if (params.lowStockOnly && val.quantity > it.reorderLevel) continue;
    out.push({
      code: it.code, name: it.name, category: it.category.name, uom: it.uom.code, status: it.status,
      quantity: val.quantity, unitCost: val.avgUnitCost, totalValue: val.value,
      minStock: it.minStock, maxStock: it.maxStock, reorderLevel: it.reorderLevel, safetyStock: it.safetyStock,
      isLowStock: val.quantity <= it.reorderLevel, isOutOfStock: val.quantity <= 0,
    });
  }
  return {
    totalItems: out.length,
    totalValue: out.reduce((s, i) => s + i.totalValue, 0),
    totalQuantity: out.reduce((s, i) => s + i.quantity, 0),
    lowStockCount: out.filter((i) => i.isLowStock).length,
    outOfStockCount: out.filter((i) => i.isOutOfStock).length,
    items: out,
  };
}

export async function valuationReport(params: { categoryId?: string; storeId?: string }) {
  const where: Prisma.InventoryItemWhereInput = { deletedAt: null };
  if (params.categoryId) where.categoryId = params.categoryId;
  const items = await prisma.inventoryItem.findMany({ where, include: { category: true, uom: true } });

  const out = [];
  for (const it of items) {
    const v = await computeStockValue(it.id, params.storeId);
    out.push({
      code: it.code, name: it.name, category: it.category.name, uom: it.uom.code,
      quantity: v.quantity, avgUnitCost: v.avgUnitCost, totalValue: v.value,
      fifoLayers: v.layers.length, layers: v.layers,
    });
  }
  return {
    totalItems: out.length,
    totalValue: out.reduce((s, i) => s + i.totalValue, 0),
    totalQuantity: out.reduce((s, i) => s + i.quantity, 0),
    items: out.sort((a, b) => b.totalValue - a.totalValue),
  };
}

export async function movementReport(params: { startDate?: string; endDate?: string; storeId?: string; itemId?: string; type?: string; userId?: string; page: number; limit: number }) {
  const where: Prisma.StockTransactionWhereInput = {};
  if (params.startDate || params.endDate) {
    where.transactionDate = {};
    if (params.startDate) where.transactionDate.gte = new Date(params.startDate);
    if (params.endDate) where.transactionDate.lte = new Date(params.endDate);
  }
  if (params.storeId) where.storeId = params.storeId;
  if (params.itemId) where.itemId = params.itemId;
  if (params.type) where.type = params.type as any;
  if (params.userId) where.userId = params.userId;

  const [total, rows] = await Promise.all([
    prisma.stockTransaction.count({ where }),
    prisma.stockTransaction.findMany({
      where, orderBy: { transactionDate: "desc" },
      skip: (params.page - 1) * params.limit, take: params.limit,
      include: { item: { include: { uom: true } }, user: true, store: true },
    }),
  ]);

  return { total, items: rows.map((t) => ({
    id: t.id, code: t.code, type: t.type, itemCode: t.item?.code ?? null, itemName: t.item?.name ?? null,
    uom: t.item?.uom?.code ?? null, quantity: t.quantity, unitCost: t.unitCost,
    balanceBefore: t.balanceBefore, balanceAfter: t.balanceAfter,
    referenceType: t.referenceType, referenceId: t.referenceId,
    user: t.user?.fullName ?? null, store: t.store?.code ?? null,
    remarks: t.remarks, transactionDate: t.transactionDate.toISOString(),
  })) };
}

export async function auditReport(params: { startDate?: string; endDate?: string; userId?: string; module?: string; action?: string; page: number; limit: number }) {
  const where: Prisma.AuditLogWhereInput = {};
  if (params.startDate || params.endDate) {
    where.timestamp = {};
    if (params.startDate) where.timestamp.gte = new Date(params.startDate);
    if (params.endDate) where.timestamp.lte = new Date(params.endDate);
  }
  if (params.userId) where.userId = params.userId;
  if (params.module) where.module = params.module;
  if (params.action) where.action = { contains: params.action };

  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where, orderBy: { timestamp: "desc" },
      skip: (params.page - 1) * params.limit, take: params.limit, include: { user: true },
    }),
  ]);

  return { total, items: rows.map((a) => ({
    id: a.id, action: a.action, module: a.module, entity: a.entity, entityId: a.entityId,
    user: a.user ? { id: a.user.id, fullName: a.user.fullName, email: a.user.email } : null,
    oldValue: a.oldValue, newValue: a.newValue, ipAddress: a.ipAddress, description: a.description,
    timestamp: a.timestamp.toISOString(),
  })) };
}
