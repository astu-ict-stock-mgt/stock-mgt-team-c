import { Prisma, TransferStatus, TransactionType } from "@prisma/client";
import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { recordAudit, AuditContext } from "./audit";

function generateTransferCode(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TRF-${dateStr}-${rand}`;
}

export async function createTransfer(data: any, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();
  if (data.fromStoreId === data.toStoreId) {
    throw Errors.validation("Source and destination stores must be different.");
  }

  return prisma.$transaction(async (tx) => {
    const fromStore = await tx.store.findUnique({ where: { id: data.fromStoreId } });
    if (!fromStore) throw Errors.notFound("Store", data.fromStoreId);
    
    const toStore = await tx.store.findUnique({ where: { id: data.toStoreId } });
    if (!toStore) throw Errors.notFound("Store", data.toStoreId);

    const transfer = await tx.transferRequest.create({
      data: {
        code: generateTransferCode(),
        fromStoreId: data.fromStoreId,
        toStoreId: data.toStoreId,
        requestedById: ctx.userId!,
        reason: data.reason,
        notes: data.notes,
        status: TransferStatus.DRAFT,
        items: {
          create: data.items.map((item: any) => ({
            itemId: item.itemId,
            quantity: item.quantity,
            dispatchedQty: 0,
            receivedQty: 0,
          })),
        },
      },
      include: { items: true },
    });

    await recordAudit({ ctx, action: "CREATED", module: "transfers", entity: "transfer", entityId: transfer.id });
    return transfer;
  });
}

export async function submitTransfer(id: string, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const trf = await tx.transferRequest.findUnique({ where: { id } });
    if (!trf) throw Errors.notFound("TransferRequest", id);
    if (trf.status !== TransferStatus.DRAFT) throw Errors.conflict("Only DRAFT transfers can be submitted.");

    const updated = await tx.transferRequest.update({
      where: { id },
      data: { status: TransferStatus.SUBMITTED }
    });

    await recordAudit({ ctx, action: "SUBMITTED", module: "transfers", entity: "transfer", entityId: id });
    return updated;
  });
}

export async function approveTransfer(id: string, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const trf = await tx.transferRequest.findUnique({ where: { id } });
    if (!trf) throw Errors.notFound("TransferRequest", id);
    if (trf.status !== TransferStatus.SUBMITTED) throw Errors.conflict("Only SUBMITTED transfers can be approved.");

    const updated = await tx.transferRequest.update({
      where: { id },
      data: { status: TransferStatus.APPROVED }
    });

    await recordAudit({ ctx, action: "APPROVED", module: "transfers", entity: "transfer", entityId: id });
    return updated;
  });
}

export async function rejectTransfer(id: string, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const trf = await tx.transferRequest.findUnique({ where: { id } });
    if (!trf) throw Errors.notFound("TransferRequest", id);
    if (trf.status !== TransferStatus.SUBMITTED) throw Errors.conflict("Only SUBMITTED transfers can be rejected.");

    const updated = await tx.transferRequest.update({
      where: { id },
      data: { status: TransferStatus.REJECTED }
    });

    await recordAudit({ ctx, action: "REJECTED", module: "transfers", entity: "transfer", entityId: id });
    return updated;
  });
}

export async function dispatchTransfer(id: string, data: any, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const trf = await tx.transferRequest.findUnique({
      where: { id },
      include: { items: true }
    });
    if (!trf) throw Errors.notFound("TransferRequest", id);

    const lock = await tx.transferRequest.updateMany({
      where: { id, status: TransferStatus.APPROVED },
      data: { status: TransferStatus.DISPATCHED }
    });
    if (lock.count === 0) throw Errors.conflict("Transfer must be APPROVED to dispatch. It may have already been dispatched.");

    for (const dispatchData of data.items) {
      const dbItem = trf.items.find(i => i.itemId === dispatchData.itemId);
      if (!dbItem) throw Errors.notFound("TransferRequestItem", dispatchData.itemId);

      let totalDispatched = 0;
      for (const alloc of dispatchData.allocations) {
        if (alloc.quantity <= 0) throw Errors.validation("Bin allocation quantity must be positive");
        totalDispatched += alloc.quantity;

        const bin = await tx.bin.findUnique({
          where: { id: alloc.binId },
          include: { shelf: { include: { location: true } } }
        });
        if (!bin) throw Errors.notFound("Bin", alloc.binId);
        if (bin.shelf.location.storeId !== trf.fromStoreId) {
          throw Errors.validation(`Bin ${bin.name} does not belong to source store.`);
        }

        const binStock = await tx.binStock.update({
          where: { itemId_binId: { itemId: dbItem.itemId, binId: alloc.binId } },
          data: { quantity: { decrement: alloc.quantity } }
        });

        if (binStock.quantity < 0) throw Errors.conflict(`Insufficient stock in bin ${bin.name}.`);

        await tx.transferOutBinAllocation.create({
          data: { transferItemId: dbItem.id, binId: alloc.binId, quantity: alloc.quantity }
        });

        await tx.binCard.create({
          data: {
            binId: alloc.binId,
            itemId: dbItem.itemId,
            transactionType: "TRANSFER_OUT",
            referenceDoc: trf.code,
            outQty: alloc.quantity,
            balance: binStock.quantity
          }
        });
      }

      if (totalDispatched > dbItem.quantity) {
        throw Errors.validation(`Dispatched quantity for item ${dbItem.itemId} exceeds requested quantity.`);
      }

      const storeStock = await tx.storeStock.update({
        where: { itemId_storeId: { itemId: dbItem.itemId, storeId: trf.fromStoreId } },
        data: { quantity: { decrement: totalDispatched } }
      });

      if (storeStock.quantity < 0) throw Errors.conflict(`Insufficient total store stock for item ${dbItem.itemId}.`);

      // Consume FIFO layers
      let qtyToConsume = totalDispatched;
      let totalCost = 0;
      const layers = await tx.fifoLayer.findMany({
        where: { storeId: trf.fromStoreId, itemId: dbItem.itemId, remainingQty: { gt: 0 } },
        orderBy: { createdAt: "asc" }
      });

      for (const layer of layers) {
        if (qtyToConsume <= 0) break;
        const consume = Math.min(layer.remainingQty, qtyToConsume);
        
        await tx.fifoLayer.update({
          where: { id: layer.id },
          data: { remainingQty: { decrement: consume } }
        });
        
        totalCost += consume * layer.unitCost;
        qtyToConsume -= consume;
      }

      if (qtyToConsume > 0) throw Errors.conflict(`Insufficient FIFO layers for item ${dbItem.itemId}.`);

      const blendedUnitCost = totalDispatched > 0 ? totalCost / totalDispatched : 0;

      await tx.transferRequestItem.update({
        where: { id: dbItem.id },
        data: { dispatchedQty: totalDispatched }
      });

      // StockTransaction
      await tx.stockTransaction.create({
        data: {
          code: `TXN-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`,
          itemId: dbItem.itemId,
          storeId: trf.fromStoreId,
          type: TransactionType.TRANSFER_OUT,
          quantity: totalDispatched,
          unitCost: blendedUnitCost,
          balanceBefore: storeStock.quantity + totalDispatched,
          balanceAfter: storeStock.quantity,
          referenceType: "STORE_TRANSFER",
          referenceId: trf.id,
          userId: ctx.userId!,
          remarks: "Transfer dispatched"
        }
      });

      await tx.stockCard.create({
        data: {
          storeId: trf.fromStoreId,
          itemId: dbItem.itemId,
          transactionType: "TRANSFER_OUT",
          referenceDoc: trf.code,
          outQty: totalDispatched,
          balance: storeStock.quantity
        }
      });
    }

    await recordAudit({ ctx, action: "DISPATCHED", module: "transfers", entity: "transfer", entityId: id });
    return tx.transferRequest.findUnique({ where: { id } });
  });
}

export async function receiveTransfer(id: string, data: any, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const trf = await tx.transferRequest.findUnique({
      where: { id },
      include: { items: true }
    });
    if (!trf) throw Errors.notFound("TransferRequest", id);

    const lock = await tx.transferRequest.updateMany({
      where: { id, status: TransferStatus.DISPATCHED },
      data: { status: TransferStatus.RECEIVED }
    });
    if (lock.count === 0) throw Errors.conflict("Transfer must be DISPATCHED to receive.");

    let totalDiscrepancy = 0;

    for (const receiveData of data.items) {
      const dbItem = trf.items.find(i => i.itemId === receiveData.itemId);
      if (!dbItem) throw Errors.notFound("TransferRequestItem", receiveData.itemId);

      if (receiveData.receivedQty > dbItem.dispatchedQty) {
        throw Errors.validation(`Received quantity cannot exceed dispatched quantity for item ${dbItem.itemId}.`);
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
        if (bin.shelf.location.storeId !== trf.toStoreId) {
          throw Errors.validation(`Bin ${bin.name} does not belong to destination store.`);
        }

        const binStock = await tx.binStock.upsert({
          where: { itemId_binId: { itemId: dbItem.itemId, binId: alloc.binId } },
          create: { itemId: dbItem.itemId, binId: alloc.binId, quantity: alloc.quantity, reservedQty: 0 },
          update: { quantity: { increment: alloc.quantity } }
        });

        await tx.transferInBinAllocation.create({
          data: { transferItemId: dbItem.id, binId: alloc.binId, quantity: alloc.quantity }
        });

        await tx.binCard.create({
          data: {
            binId: alloc.binId,
            itemId: dbItem.itemId,
            transactionType: "TRANSFER_IN",
            referenceDoc: trf.code,
            inQty: alloc.quantity,
            balance: binStock.quantity
          }
        });
      }

      if (totalAllocated !== receiveData.receivedQty) {
        throw Errors.validation(`Total bin allocations must equal received quantity for item ${dbItem.itemId}.`);
      }

      const discrepancy = dbItem.dispatchedQty - receiveData.receivedQty;
      totalDiscrepancy += discrepancy;

      await tx.transferRequestItem.update({
        where: { id: dbItem.id },
        data: { receivedQty: receiveData.receivedQty }
      });

      if (receiveData.receivedQty > 0) {
        const storeStock = await tx.storeStock.upsert({
          where: { itemId_storeId: { itemId: dbItem.itemId, storeId: trf.toStoreId } },
          create: { itemId: dbItem.itemId, storeId: trf.toStoreId, quantity: receiveData.receivedQty, reservedQty: 0 },
          update: { quantity: { increment: receiveData.receivedQty } }
        });

        // Fetch blended cost from source stock transaction log
        const dispatchTxn = await tx.stockTransaction.findFirst({
          where: { referenceId: trf.id, referenceType: "STORE_TRANSFER", type: TransactionType.TRANSFER_OUT, itemId: dbItem.itemId },
        });
        const unitCost = dispatchTxn ? dispatchTxn.unitCost : 0;

        await tx.fifoLayer.create({
          data: {
            storeId: trf.toStoreId,
            itemId: dbItem.itemId,
            originalQty: receiveData.receivedQty,
            remainingQty: receiveData.receivedQty,
            unitCost,
            batchNumber: trf.code
          }
        });

        await tx.stockTransaction.create({
          data: {
            code: `TXN-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`,
            itemId: dbItem.itemId,
            storeId: trf.toStoreId,
            type: TransactionType.TRANSFER_IN,
            quantity: receiveData.receivedQty,
            unitCost,
            balanceBefore: storeStock.quantity - receiveData.receivedQty,
            balanceAfter: storeStock.quantity,
            referenceType: "STORE_TRANSFER",
            referenceId: trf.id,
            userId: ctx.userId!,
            remarks: discrepancy > 0 ? `Received with discrepancy of ${discrepancy}` : "Received in full"
          }
        });

        await tx.stockCard.create({
          data: {
            storeId: trf.toStoreId,
            itemId: dbItem.itemId,
            transactionType: "TRANSFER_IN",
            referenceDoc: trf.code,
            inQty: receiveData.receivedQty,
            balance: storeStock.quantity
          }
        });
      }
    }

    if (totalDiscrepancy > 0) {
      await tx.transferRequest.update({
        where: { id },
        data: { notes: trf.notes ? `${trf.notes}\nDISCREPANCY INVESTIGATION REQUIRED: Missing total of ${totalDiscrepancy} items across dispatch` : `DISCREPANCY INVESTIGATION REQUIRED: Missing total of ${totalDiscrepancy} items across dispatch` }
      });
    }

    await recordAudit({ ctx, action: "RECEIVED", module: "transfers", entity: "transfer", entityId: id });
    return tx.transferRequest.findUnique({ where: { id }, include: { items: true } });
  });
}
