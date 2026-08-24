import { Prisma, ReturnStatus, TransactionType } from "@prisma/client";
import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { recordAudit, AuditContext } from "./audit";

function generateSRNCode(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SRN-${dateStr}-${rand}`;
}

export async function createReturn(data: any, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const store = await tx.store.findUnique({ where: { id: data.storeId } });
    if (!store) throw Errors.notFound("Store", data.storeId);

    const srn = await tx.storeReturnNote.create({
      data: {
        code: generateSRNCode(),
        storeId: data.storeId,
        department: data.department,
        originalSivId: data.originalSivId,
        requestedById: ctx.userId!,
        returnedById: ctx.userId!,
        notes: data.notes,
        status: ReturnStatus.DRAFT,
        items: {
          create: data.items.map((item: any) => ({
            itemId: item.itemId,
            quantity: item.quantity,
            reason: item.reason,
            condition: item.condition,
          })),
        },
      },
      include: { items: true },
    });

    await recordAudit({ ctx, action: "CREATED", module: "returns", entity: "return", entityId: srn.id });
    return srn;
  });
}

export async function getReturn(id: string) {
  const srn = await prisma.storeReturnNote.findUnique({
    where: { id },
    include: {
      items: { include: { item: true, allocations: true } },
      store: true,
      requestedBy: { select: { id: true, fullName: true } },
      returnedBy: { select: { id: true, fullName: true } },
    }
  });
  if (!srn) throw Errors.notFound("StoreReturnNote", id);
  return srn;
}

export async function listReturns(params: { storeId?: string, status?: ReturnStatus }) {
  const where: Prisma.StoreReturnNoteWhereInput = {};
  if (params.storeId) where.storeId = params.storeId;
  if (params.status) where.status = params.status;

  return prisma.storeReturnNote.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      store: true,
      requestedBy: { select: { id: true, fullName: true } },
    }
  });
}

export async function submitReturn(id: string, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const srn = await tx.storeReturnNote.findUnique({ where: { id } });
    if (!srn) throw Errors.notFound("StoreReturnNote", id);
    if (srn.status !== ReturnStatus.DRAFT) {
      throw Errors.conflict("Only DRAFT returns can be submitted.");
    }

    const updated = await tx.storeReturnNote.update({
      where: { id },
      data: { status: ReturnStatus.SUBMITTED }
    });

    await recordAudit({ ctx, action: "SUBMITTED", module: "returns", entity: "return", entityId: id });
    return updated;
  });
}

export async function evaluateReturn(id: string, data: any, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const srn = await tx.storeReturnNote.findUnique({
      where: { id },
      include: { items: true }
    });
    if (!srn) throw Errors.notFound("StoreReturnNote", id);
    if (srn.status !== ReturnStatus.SUBMITTED && srn.status !== ReturnStatus.UNDER_EVALUATION) {
      throw Errors.conflict("Return must be SUBMITTED or UNDER_EVALUATION to evaluate.");
    }

    for (const evaluatedItem of data.items) {
      const dbItem = srn.items.find(i => i.itemId === evaluatedItem.itemId);
      if (!dbItem) throw Errors.notFound("StoreReturnItem", evaluatedItem.itemId);

      if (evaluatedItem.acceptedQty > dbItem.quantity) {
        throw Errors.validation("Accepted quantity cannot exceed requested return quantity.");
      }

      await tx.storeReturnItem.update({
        where: { id: dbItem.id },
        data: { acceptedQty: evaluatedItem.acceptedQty }
      });
    }

    const updated = await tx.storeReturnNote.update({
      where: { id },
      data: { status: ReturnStatus.UNDER_EVALUATION, notes: data.notes ? data.notes : srn.notes }
    });

    await recordAudit({ ctx, action: "EVALUATED", module: "returns", entity: "return", entityId: id });
    return updated;
  });
}

export async function approveReturn(id: string, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const srn = await tx.storeReturnNote.findUnique({
      where: { id },
      include: { items: true }
    });
    if (!srn) throw Errors.notFound("StoreReturnNote", id);
    if (srn.status !== ReturnStatus.UNDER_EVALUATION) {
      throw Errors.conflict("Return must be UNDER_EVALUATION to approve.");
    }

    for (const item of srn.items) {
      if (item.acceptedQty === null || item.acceptedQty === undefined) {
        throw Errors.validation(`Item ${item.itemId} has not been evaluated (missing acceptedQty).`);
      }
    }

    const updated = await tx.storeReturnNote.update({
      where: { id },
      data: { status: ReturnStatus.APPROVED }
    });

    await recordAudit({ ctx, action: "APPROVED", module: "returns", entity: "return", entityId: id });
    return updated;
  });
}

export async function rejectReturn(id: string, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const srn = await tx.storeReturnNote.findUnique({ where: { id } });
    if (!srn) throw Errors.notFound("StoreReturnNote", id);
    
    // Can reject from SUBMITTED or UNDER_EVALUATION
    if (srn.status !== ReturnStatus.SUBMITTED && srn.status !== ReturnStatus.UNDER_EVALUATION) {
      throw Errors.conflict("Return cannot be rejected from its current state.");
    }

    const updated = await tx.storeReturnNote.update({
      where: { id },
      data: { status: ReturnStatus.REJECTED }
    });

    await recordAudit({ ctx, action: "REJECTED", module: "returns", entity: "return", entityId: id });
    return updated;
  });
}

export async function receiveReturn(id: string, data: any, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const srn = await tx.storeReturnNote.findUnique({
      where: { id },
      include: { items: true }
    });
    if (!srn) throw Errors.notFound("StoreReturnNote", id);

    // ATOMIC LOCK
    const lock = await tx.storeReturnNote.updateMany({
      where: { id, status: ReturnStatus.APPROVED },
      data: { status: ReturnStatus.RECEIVED, date: new Date() }
    });
    if (lock.count === 0) {
      throw Errors.conflict("Return must be APPROVED to receive. It may have already been received.");
    }

    // Determine Valuation
    let originalSivItems: Record<string, any> = {};
    if (srn.originalSivId) {
      const originalSiv = await tx.storeIssueVoucher.findUnique({
        where: { id: srn.originalSivId },
        include: { items: true }
      });
      if (originalSiv) {
        for (const sivItem of originalSiv.items) {
          originalSivItems[sivItem.itemId] = sivItem;
        }
      }
    }

    for (const receiveData of data.items) {
      const returnItem = srn.items.find(i => i.itemId === receiveData.itemId);
      if (!returnItem) throw Errors.notFound("StoreReturnItem", receiveData.itemId);

      if (returnItem.acceptedQty === null || returnItem.acceptedQty === undefined || returnItem.acceptedQty <= 0) {
        continue; // Nothing to receive for this item
      }

      let totalAllocated = 0;
      for (const alloc of receiveData.allocations) {
        if (alloc.quantity <= 0) throw Errors.validation("Bin allocation quantity must be positive");
        totalAllocated += alloc.quantity;

        const bin = await tx.bin.findUnique({
          where: { id: alloc.binId },
          include: { shelf: { include: { location: true } } }
        });
        if (!bin) throw Errors.notFound("Bin", alloc.binId);
        if (bin.shelf.location.storeId !== srn.storeId) {
          throw Errors.validation(`Bin ${bin.name} does not belong to destination store.`);
        }

        // Increase BinStock
        const binStock = await tx.binStock.upsert({
          where: { itemId_binId: { itemId: returnItem.itemId, binId: alloc.binId } },
          create: { itemId: returnItem.itemId, binId: alloc.binId, quantity: alloc.quantity, reservedQty: 0 },
          update: { quantity: { increment: alloc.quantity } }
        });

        // Create ReturnBinAllocation
        await tx.returnBinAllocation.create({
          data: {
            returnItemId: returnItem.id,
            binId: alloc.binId,
            quantity: alloc.quantity
          }
        });

        // BinCard IN
        await tx.binCard.create({
          data: {
            binId: alloc.binId,
            itemId: returnItem.itemId,
            transactionType: "RECEIPT",
            referenceDoc: srn.code,
            inQty: alloc.quantity,
            balance: binStock.quantity
          }
        });
      }

      if (totalAllocated !== returnItem.acceptedQty) {
        throw Errors.validation(`Total allocated quantity for item ${returnItem.itemId} must equal the accepted quantity of ${returnItem.acceptedQty}`);
      }

      // Increase StoreStock
      const storeStock = await tx.storeStock.upsert({
        where: { itemId_storeId: { itemId: returnItem.itemId, storeId: srn.storeId } },
        create: { itemId: returnItem.itemId, storeId: srn.storeId, quantity: totalAllocated, reservedQty: 0 },
        update: { quantity: { increment: totalAllocated } }
      });

      // Valuation
      let unitCost = 0;
      if (originalSivItems[returnItem.itemId]) {
        unitCost = originalSivItems[returnItem.itemId].unitCost || 0;
      } else {
        throw Errors.validation(`Cannot reliably determine original issue cost for item ${returnItem.itemId}. originalSivId is missing or item was not in the original SIV.`);
      }

      await tx.storeReturnItem.update({
        where: { id: returnItem.id },
        data: { unitCost }
      });

      // Create FIFO Layer
      await tx.fifoLayer.create({
        data: {
          storeId: srn.storeId,
          itemId: returnItem.itemId,
          quantity: totalAllocated,
          remainingQty: totalAllocated,
          unitCost: unitCost,
          reference: srn.code
        }
      });

      // Create StockTransaction
      await tx.stockTransaction.create({
        data: {
          code: `TXN-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`,
          itemId: returnItem.itemId,
          storeId: srn.storeId,
          type: TransactionType.RETURN,
          quantity: totalAllocated,
          unitCost: unitCost,
          balanceBefore: storeStock.quantity - totalAllocated, // Approximate for transaction log
          balanceAfter: storeStock.quantity,
          referenceType: "STORE_RETURN",
          referenceId: srn.id,
          userId: ctx.userId!,
          remarks: "Received store return"
        }
      });

      // StockCard IN
      await tx.stockCard.create({
        data: {
          storeId: srn.storeId,
          itemId: returnItem.itemId,
          transactionType: "RECEIPT", // Treated as a form of receipt
          referenceDoc: srn.code,
          inQty: totalAllocated,
          balance: storeStock.quantity
        }
      });
    }

    await recordAudit({ ctx, action: "RECEIVED", module: "returns", entity: "return", entityId: id });
    
    return tx.storeReturnNote.findUnique({ where: { id } });
  });
}
