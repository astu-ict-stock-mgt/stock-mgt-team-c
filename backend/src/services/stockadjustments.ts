import { Prisma, StockAdjustmentStatus, StockTakeStatus, TransactionType } from "@prisma/client";
import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { recordAudit, AuditContext } from "./audit";

function generateAdjustmentCode(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ADJ-${dateStr}-${rand}`;
}

const adjustmentInclude = {
  store: true,
  stockTake: { select: { id: true, code: true, status: true } },
  requestedBy: { select: { id: true, fullName: true } },
  approvedBy: { select: { id: true, fullName: true } },
  items: {
    include: {
      item: { select: { id: true, code: true, name: true } },
      bin: { select: { id: true, code: true, name: true } },
    },
  },
} satisfies Prisma.StockAdjustmentInclude;

export async function listStockAdjustments(params: {
  storeId?: string;
  status?: StockAdjustmentStatus;
  stockTakeId?: string;
}) {
  const where: Prisma.StockAdjustmentWhereInput = {};
  if (params.storeId) where.storeId = params.storeId;
  if (params.status) where.status = params.status;
  if (params.stockTakeId) where.stockTakeId = params.stockTakeId;

  return prisma.stockAdjustment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: adjustmentInclude,
  });
}

export async function getStockAdjustment(id: string) {
  const adj = await prisma.stockAdjustment.findUnique({
    where: { id },
    include: adjustmentInclude,
  });
  if (!adj) throw Errors.notFound("StockAdjustment", id);
  return adj;
}

async function resolvePositiveUnitCost(
  tx: Prisma.TransactionClient,
  storeId: string,
  itemId: string,
  explicit?: number | null
): Promise<number> {
  if (explicit !== null && explicit !== undefined) {
    if (explicit <= 0) throw Errors.validation("Unit cost must be greater than zero for positive variance items.");
    return explicit;
  }

  const latestLayer = await tx.fifoLayer.findFirst({
    where: { storeId, itemId, remainingQty: { gt: 0 } },
    orderBy: { createdAt: "desc" },
  });
  if (!latestLayer) {
    const anyLayer = await tx.fifoLayer.findFirst({
      where: { storeId, itemId },
      orderBy: { createdAt: "desc" },
    });
    if (!anyLayer) {
      throw Errors.validation(
        `No historical FIFO cost for item ${itemId}. Enter an explicit unit cost before posting.`
      );
    }
    return anyLayer.unitCost;
  }
  return latestLayer.unitCost;
}

export async function approveStockAdjustment(id: string, data: { items?: Array<{ itemId: string; binId: string; unitCost?: number }> }, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const adj = await tx.stockAdjustment.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!adj) throw Errors.notFound("StockAdjustment", id);
    if (adj.status !== StockAdjustmentStatus.DRAFT && adj.status !== StockAdjustmentStatus.SUBMITTED) {
      throw Errors.conflict("Only DRAFT or SUBMITTED adjustments can be approved.");
    }

    if (data.items?.length) {
      for (const override of data.items) {
        const line = adj.items.find((i) => i.itemId === override.itemId && i.binId === override.binId);
        if (!line) throw Errors.notFound("StockAdjustmentItem", `${override.itemId}-${override.binId}`);
        if (line.variance <= 0) continue;
        if (override.unitCost === undefined) continue;
        if (override.unitCost <= 0) throw Errors.validation("Unit cost must be greater than zero.");
        await tx.stockAdjustmentItem.update({
          where: { id: line.id },
          data: { unitCost: override.unitCost },
        });
      }
    }

    const refreshed = await tx.stockAdjustment.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!refreshed) throw Errors.notFound("StockAdjustment", id);

    for (const line of refreshed.items) {
      if (line.variance <= 0) continue;
      await resolvePositiveUnitCost(tx, refreshed.storeId, line.itemId, line.unitCost);
    }

    const updated = await tx.stockAdjustment.update({
      where: { id },
      data: {
        status: StockAdjustmentStatus.APPROVED,
        approvedById: ctx.userId!,
      },
      include: adjustmentInclude,
    });

    await recordAudit({ ctx, action: "APPROVED", module: "stockadjustments", entity: "stockadjustment", entityId: id });
    return updated;
  });
}

export async function rejectStockAdjustment(id: string, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const adj = await tx.stockAdjustment.findUnique({ where: { id } });
    if (!adj) throw Errors.notFound("StockAdjustment", id);
    if (adj.status !== StockAdjustmentStatus.DRAFT && adj.status !== StockAdjustmentStatus.SUBMITTED && adj.status !== StockAdjustmentStatus.APPROVED) {
      throw Errors.conflict("Cannot reject this adjustment in its current status.");
    }

    const updated = await tx.stockAdjustment.update({
      where: { id },
      data: { status: StockAdjustmentStatus.REJECTED },
      include: adjustmentInclude,
    });

    await recordAudit({ ctx, action: "REJECTED", module: "stockadjustments", entity: "stockadjustment", entityId: id });
    return updated;
  });
}

export async function postStockAdjustment(id: string, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const lock = await tx.stockAdjustment.updateMany({
      where: { id, status: StockAdjustmentStatus.APPROVED },
      data: { status: StockAdjustmentStatus.POSTED },
    });
    if (lock.count === 0) {
      throw Errors.conflict("Adjustment must be APPROVED to post. It may have already been posted concurrently.");
    }

    const adj = await tx.stockAdjustment.findUnique({
      where: { id },
      include: { items: true, stockTake: true },
    });
    if (!adj) throw Errors.notFound("StockAdjustment", id);

    for (const line of adj.items) {
      if (line.variance === 0) continue;
      const delta = Math.abs(line.variance);

      if (line.variance < 0) {
        const binStock = await tx.binStock.findUnique({
          where: { itemId_binId: { itemId: line.itemId, binId: line.binId } },
        });
        if (!binStock || binStock.quantity < delta) {
          throw Errors.conflict(`Insufficient bin stock to post negative adjustment for item ${line.itemId}.`);
        }

        const updatedBinStock = await tx.binStock.update({
          where: { id: binStock.id },
          data: { quantity: { decrement: delta } },
        });
        if (updatedBinStock.quantity < 0) {
          throw Errors.conflict(`Concurrent modification: bin stock fell below zero for item ${line.itemId}.`);
        }

        const storeStock = await tx.storeStock.findUnique({
          where: { itemId_storeId: { itemId: line.itemId, storeId: adj.storeId } },
        });
        if (!storeStock || storeStock.quantity < delta) {
          throw Errors.conflict(`Insufficient store stock to post negative adjustment for item ${line.itemId}.`);
        }

        const updatedStoreStock = await tx.storeStock.update({
          where: { id: storeStock.id },
          data: { quantity: { decrement: delta } },
        });
        if (updatedStoreStock.quantity < 0) {
          throw Errors.conflict(`Concurrent modification: store stock fell below zero for item ${line.itemId}.`);
        }

        let qtyToConsume = delta;
        let totalCost = 0;
        const fifoLayers = await tx.fifoLayer.findMany({
          where: { itemId: line.itemId, storeId: adj.storeId, remainingQty: { gt: 0 } },
          orderBy: { createdAt: "asc" },
        });

        for (const layer of fifoLayers) {
          if (qtyToConsume <= 0) break;
          const take = Math.min(layer.remainingQty, qtyToConsume);
          await tx.fifoLayer.update({
            where: { id: layer.id },
            data: { remainingQty: { decrement: take } },
          });
          totalCost += take * layer.unitCost;
          qtyToConsume -= take;
        }

        if (qtyToConsume > 0) {
          throw Errors.conflict(`Insufficient FIFO layers to consume for item ${line.itemId}.`);
        }

        const unitCost = delta > 0 ? totalCost / delta : 0;

        await tx.stockTransaction.create({
          data: {
            code: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            itemId: line.itemId,
            storeId: adj.storeId,
            type: TransactionType.ADJUSTMENT_OUT,
            quantity: -delta,
            unitCost,
            balanceBefore: storeStock.quantity,
            balanceAfter: updatedStoreStock.quantity,
            referenceType: "STOCK_ADJUSTMENT",
            referenceId: adj.id,
            userId: ctx.userId!,
            remarks: `Stock take adjustment ${adj.code}`,
          },
        });

        await tx.stockCard.create({
          data: {
            storeId: adj.storeId,
            itemId: line.itemId,
            transactionType: "ADJUSTMENT_OUT",
            referenceDoc: adj.code,
            outQty: delta,
            balance: updatedStoreStock.quantity,
          },
        });

        await tx.binCard.create({
          data: {
            binId: line.binId,
            itemId: line.itemId,
            transactionType: "ADJUSTMENT_OUT",
            referenceDoc: adj.code,
            outQty: delta,
            balance: updatedBinStock.quantity,
          },
        });
      } else {
        const unitCost = await resolvePositiveUnitCost(tx, adj.storeId, line.itemId, line.unitCost);

        const updatedBinStock = await tx.binStock.upsert({
          where: { itemId_binId: { itemId: line.itemId, binId: line.binId } },
          create: { itemId: line.itemId, binId: line.binId, quantity: delta, reservedQty: 0 },
          update: { quantity: { increment: delta } },
        });

        const storeStock = await tx.storeStock.upsert({
          where: { itemId_storeId: { itemId: line.itemId, storeId: adj.storeId } },
          create: { itemId: line.itemId, storeId: adj.storeId, quantity: delta, reservedQty: 0 },
          update: { quantity: { increment: delta } },
        });

        await tx.fifoLayer.create({
          data: {
            storeId: adj.storeId,
            itemId: line.itemId,
            originalQty: delta,
            remainingQty: delta,
            unitCost,
            batchNumber: adj.code,
          },
        });

        await tx.stockTransaction.create({
          data: {
            code: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            itemId: line.itemId,
            storeId: adj.storeId,
            type: TransactionType.ADJUSTMENT_IN,
            quantity: delta,
            unitCost,
            balanceBefore: storeStock.quantity - delta,
            balanceAfter: storeStock.quantity,
            referenceType: "STOCK_ADJUSTMENT",
            referenceId: adj.id,
            userId: ctx.userId!,
            remarks: `Stock take adjustment ${adj.code}`,
          },
        });

        await tx.stockCard.create({
          data: {
            storeId: adj.storeId,
            itemId: line.itemId,
            transactionType: "ADJUSTMENT_IN",
            referenceDoc: adj.code,
            inQty: delta,
            balance: storeStock.quantity,
          },
        });

        await tx.binCard.create({
          data: {
            binId: line.binId,
            itemId: line.itemId,
            transactionType: "ADJUSTMENT_IN",
            referenceDoc: adj.code,
            inQty: delta,
            balance: updatedBinStock.quantity,
          },
        });

        await tx.stockAdjustmentItem.update({
          where: { id: line.id },
          data: { unitCost },
        });
      }
    }

    if (adj.stockTakeId) {
      await tx.stockTake.update({
        where: { id: adj.stockTakeId },
        data: { status: StockTakeStatus.RECONCILED, endDate: new Date() },
      });
    }

    await recordAudit({ ctx, action: "POSTED", module: "stockadjustments", entity: "stockadjustment", entityId: id });

    return tx.stockAdjustment.findUnique({
      where: { id },
      include: adjustmentInclude,
    });
  });
}
