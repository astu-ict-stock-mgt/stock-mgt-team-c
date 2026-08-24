import { Prisma, StockTakeStatus } from "@prisma/client";
import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { recordAudit, AuditContext } from "./audit";

function generateStockTakeCode(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ST-${dateStr}-${rand}`;
}

const stockTakeInclude = {
  store: true,
  conductedBy: { select: { id: true, fullName: true } },
  items: {
    include: {
      item: { select: { id: true, code: true, name: true } },
      bin: { select: { id: true, code: true, name: true } },
    },
  },
  adjustment: {
    include: {
      items: {
        include: {
          item: { select: { id: true, code: true, name: true } },
          bin: { select: { id: true, code: true, name: true } },
        },
      },
    },
  },
} satisfies Prisma.StockTakeInclude;

export async function listStockTakes(params: { storeId?: string; status?: StockTakeStatus; search?: string }) {
  const where: Prisma.StockTakeWhereInput = {};
  if (params.storeId) where.storeId = params.storeId;
  if (params.status) where.status = params.status;
  if (params.search) {
    where.OR = [
      { code: { contains: params.search, mode: "insensitive" } },
      { notes: { contains: params.search, mode: "insensitive" } },
    ];
  }

  return prisma.stockTake.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: stockTakeInclude,
  });
}

export async function getStockTake(id: string) {
  const st = await prisma.stockTake.findUnique({
    where: { id },
    include: stockTakeInclude,
  });
  if (!st) throw Errors.notFound("StockTake", id);
  return st;
}

export async function updateStockTake(id: string, data: { notes?: string }, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const st = await tx.stockTake.findUnique({ where: { id } });
    if (!st) throw Errors.notFound("StockTake", id);
    if (st.status !== StockTakeStatus.DRAFT) {
      throw Errors.conflict("Only DRAFT stock takes can be updated.");
    }

    const updated = await tx.stockTake.update({
      where: { id },
      data: { notes: data.notes },
      include: stockTakeInclude,
    });

    await recordAudit({ ctx, action: "UPDATED", module: "stocktakes", entity: "stocktake", entityId: id });
    return updated;
  });
}

export async function createStockTake(data: any, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const store = await tx.store.findUnique({ where: { id: data.storeId } });
    if (!store) throw Errors.notFound("Store", data.storeId);

    const st = await tx.stockTake.create({
      data: {
        code: generateStockTakeCode(),
        storeId: data.storeId,
        conductedById: ctx.userId!,
        status: StockTakeStatus.DRAFT,
        notes: data.notes,
      },
    });

    await recordAudit({ ctx, action: "CREATED", module: "stocktakes", entity: "stocktake", entityId: st.id });
    return tx.stockTake.findUnique({ where: { id: st.id }, include: stockTakeInclude });
  });
}

export async function addStockTakeItems(id: string, data: any, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const st = await tx.stockTake.findUnique({ where: { id }, include: { items: true } });
    if (!st) throw Errors.notFound("StockTake", id);
    if (st.status !== StockTakeStatus.DRAFT) throw Errors.conflict("Can only add items to DRAFT stock takes.");

    for (const item of data.items) {
      // Validate unique within stocktake
      const existing = st.items.find(i => i.itemId === item.itemId && i.binId === item.binId);
      if (existing) throw Errors.validation(`Item ${item.itemId} in bin ${item.binId} already exists in this count.`);

      // Validate bin belongs to store
      const bin = await tx.bin.findUnique({ where: { id: item.binId }, include: { shelf: { include: { location: true } } } });
      if (!bin) throw Errors.notFound("Bin", item.binId);
      if (bin.shelf.location.storeId !== st.storeId) throw Errors.validation(`Bin ${bin.name} does not belong to store ${st.storeId}.`);

      const invItem = await tx.inventoryItem.findUnique({ where: { id: item.itemId } });
      if (!invItem) throw Errors.notFound("InventoryItem", item.itemId);

      await tx.stockTakeItem.create({
        data: {
          stockTakeId: st.id,
          itemId: item.itemId,
          binId: item.binId,
        }
      });
    }

    await recordAudit({ ctx, action: "UPDATED", module: "stocktakes", entity: "stocktake", entityId: st.id });
    return tx.stockTake.findUnique({ where: { id }, include: stockTakeInclude });
  });
}

export async function startStockTake(id: string, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const st = await tx.stockTake.findUnique({ where: { id }, include: { items: true } });
    if (!st) throw Errors.notFound("StockTake", id);
    if (st.status !== StockTakeStatus.DRAFT) throw Errors.conflict("Can only start DRAFT stock takes.");
    if (st.items.length === 0) throw Errors.validation("Cannot start an empty stock take.");

    // Snapshot systemQty
    for (const item of st.items) {
      const binStock = await tx.binStock.findUnique({
        where: { itemId_binId: { itemId: item.itemId, binId: item.binId } }
      });
      
      const systemQty = binStock ? binStock.quantity : 0;
      
      await tx.stockTakeItem.update({
        where: { id: item.id },
        data: { systemQty }
      });
    }

    await tx.stockTake.update({
      where: { id },
      data: { status: StockTakeStatus.IN_PROGRESS, startDate: new Date() }
    });

    await recordAudit({ ctx, action: "STARTED", module: "stocktakes", entity: "stocktake", entityId: id });
    return tx.stockTake.findUnique({ where: { id }, include: stockTakeInclude });
  });
}

export async function resumeStockTake(id: string, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const st = await tx.stockTake.findUnique({ where: { id }, include: { items: true } });
    if (!st) throw Errors.notFound("StockTake", id);
    if (st.status !== StockTakeStatus.RECOUNT_REQUIRED) {
      throw Errors.conflict("Can only resume RECOUNT_REQUIRED stock takes.");
    }

    const missingBaseline = st.items.some((i) => i.systemQty === null);
    if (missingBaseline) throw Errors.conflict("System quantity baseline is missing. Cannot resume counting.");

    await tx.stockTake.update({
      where: { id },
      data: { status: StockTakeStatus.IN_PROGRESS },
    });

    await recordAudit({ ctx, action: "RESUMED", module: "stocktakes", entity: "stocktake", entityId: id });
    return tx.stockTake.findUnique({ where: { id }, include: stockTakeInclude });
  });
}

export async function recordCount(id: string, data: any, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const st = await tx.stockTake.findUnique({ where: { id }, include: { items: true } });
    if (!st) throw Errors.notFound("StockTake", id);
    if (st.status !== StockTakeStatus.IN_PROGRESS) throw Errors.conflict("Can only record counts for IN_PROGRESS stock takes.");

    for (const count of data.items) {
      const stItem = st.items.find(i => i.itemId === count.itemId && i.binId === count.binId);
      if (!stItem) throw Errors.notFound("StockTakeItem", `${count.itemId}-${count.binId}`);
      
      if (stItem.systemQty === null) throw Errors.conflict("System quantity baseline is missing. Ensure the count was properly started.");

      const variance = count.physicalQty - stItem.systemQty;

      await tx.stockTakeItem.update({
        where: { id: stItem.id },
        data: {
          physicalQty: count.physicalQty,
          variance,
          remarks: count.remarks,
          unitCostOverride: count.unitCostOverride
        }
      });
    }

    await recordAudit({ ctx, action: "COUNT_RECORDED", module: "stocktakes", entity: "stocktake", entityId: id });
    return tx.stockTake.findUnique({ where: { id }, include: stockTakeInclude });
  });
}

export async function submitStockTake(id: string, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const st = await tx.stockTake.findUnique({ where: { id }, include: { items: true } });
    if (!st) throw Errors.notFound("StockTake", id);
    if (st.status !== StockTakeStatus.IN_PROGRESS) throw Errors.conflict("Can only submit IN_PROGRESS stock takes.");

    // Check that all items have been counted
    const uncounted = st.items.filter(i => i.physicalQty === null);
    if (uncounted.length > 0) throw Errors.validation(`Cannot submit: ${uncounted.length} items have not been counted.`);

    const updated = await tx.stockTake.update({
      where: { id },
      data: { status: StockTakeStatus.SUBMITTED }
    });

    await recordAudit({ ctx, action: "SUBMITTED", module: "stocktakes", entity: "stocktake", entityId: id });
    return tx.stockTake.findUnique({ where: { id }, include: stockTakeInclude });
  });
}

export async function reviewStockTake(id: string, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const st = await tx.stockTake.findUnique({ where: { id } });
    if (!st) throw Errors.notFound("StockTake", id);
    if (st.status !== StockTakeStatus.SUBMITTED) throw Errors.conflict("Can only review SUBMITTED stock takes.");

    const updated = await tx.stockTake.update({
      where: { id },
      data: { status: StockTakeStatus.UNDER_REVIEW }
    });

    await recordAudit({ ctx, action: "REVIEWED", module: "stocktakes", entity: "stocktake", entityId: id });
    return tx.stockTake.findUnique({ where: { id }, include: stockTakeInclude });
  });
}

export async function recountStockTake(id: string, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const st = await tx.stockTake.findUnique({ where: { id } });
    if (!st) throw Errors.notFound("StockTake", id);
    if (st.status !== StockTakeStatus.UNDER_REVIEW && st.status !== StockTakeStatus.SUBMITTED) {
      throw Errors.conflict("Can only request recount for SUBMITTED or UNDER_REVIEW stock takes.");
    }

    const updated = await tx.stockTake.update({
      where: { id },
      data: { status: StockTakeStatus.RECOUNT_REQUIRED } 
    });

    await recordAudit({ ctx, action: "RECOUNT_REQUESTED", module: "stocktakes", entity: "stocktake", entityId: id });
    return tx.stockTake.findUnique({ where: { id }, include: stockTakeInclude });
  });
}

export async function rejectStockTake(id: string, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const st = await tx.stockTake.findUnique({ where: { id } });
    if (!st) throw Errors.notFound("StockTake", id);
    if (st.status !== StockTakeStatus.UNDER_REVIEW && st.status !== StockTakeStatus.SUBMITTED) {
      throw Errors.conflict("Can only reject SUBMITTED or UNDER_REVIEW stock takes.");
    }

    const updated = await tx.stockTake.update({
      where: { id },
      data: { status: StockTakeStatus.REJECTED } 
    });

    await recordAudit({ ctx, action: "REJECTED", module: "stocktakes", entity: "stocktake", entityId: id });
    return tx.stockTake.findUnique({ where: { id }, include: stockTakeInclude });
  });
}

export async function approveStockTake(id: string, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const st = await tx.stockTake.findUnique({ where: { id }, include: { items: true } });
    if (!st) throw Errors.notFound("StockTake", id);
    if (st.status !== StockTakeStatus.UNDER_REVIEW && st.status !== StockTakeStatus.SUBMITTED) {
      throw Errors.conflict("Can only approve SUBMITTED or UNDER_REVIEW stock takes.");
    }

    // 1. Mark StockTake as APPROVED
    const updated = await tx.stockTake.update({
      where: { id },
      data: { status: StockTakeStatus.APPROVED }
    });

    // 2. Create StockAdjustment automatically from StockTake items
    const adjItems = st.items.filter(i => i.variance !== null && i.variance !== 0).map(i => ({
      itemId: i.itemId,
      binId: i.binId,
      variance: i.variance!,
      unitCost: i.unitCostOverride // Note: actual cost logic will be handled at POST stage if this is null
    }));

    if (adjItems.length > 0) {
      const code = `ADJ-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
      await tx.stockAdjustment.create({
        data: {
          code,
          storeId: st.storeId,
          stockTakeId: st.id,
          requestedById: ctx.userId!,
          status: "DRAFT",
          items: {
            create: adjItems
          }
        }
      });
      await recordAudit({ ctx, action: "ADJUSTMENT_CREATED", module: "stocktakes", entity: "stocktake", entityId: id });
    } else {
      // If no variance, we can just mark it RECONCILED immediately
      await tx.stockTake.update({
        where: { id },
        data: { status: StockTakeStatus.RECONCILED }
      });
    }

    await recordAudit({ ctx, action: "APPROVED", module: "stocktakes", entity: "stocktake", entityId: id });
    return tx.stockTake.findUnique({ where: { id }, include: stockTakeInclude });
  });
}
