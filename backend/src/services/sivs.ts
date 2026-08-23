import { Prisma, SIVStatus, RequisitionStatus, TransactionType, VoucherType } from "@prisma/client";
import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { recordAudit, AuditContext } from "./audit";

function generateSIVCode(isISIV: boolean): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${isISIV ? "ISIV" : "SIV"}-${dateStr}-${rand}`;
}

export async function listSIVs(params: { status?: SIVStatus; storeId?: string }) {
  const where: Prisma.StoreIssueVoucherWhereInput = {};
  if (params.status) where.status = params.status;
  if (params.storeId) where.storeId = params.storeId;

  return prisma.storeIssueVoucher.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, fullName: true } },
      store: { select: { id: true, name: true } },
      destinationStore: { select: { id: true, name: true } },
    }
  });
}

export async function getSIV(id: string) {
  const siv = await prisma.storeIssueVoucher.findUnique({
    where: { id },
    include: {
      requisition: true,
      store: { select: { id: true, name: true, code: true } },
      destinationStore: { select: { id: true, name: true, code: true } },
      createdBy: { select: { id: true, fullName: true } },
      approvedBy: { select: { id: true, fullName: true } },
      items: {
        include: {
          item: { select: { id: true, name: true, code: true, uom: true } },
          allocations: { include: { bin: { select: { id: true, name: true, code: true } } } }
        }
      }
    }
  });
  if (!siv) throw Errors.notFound("SIV", id);
  return siv;
}

export async function createPreliminarySIV(data: any, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    // 1. Validations
    const req = await tx.requisition.findUnique({
      where: { id: data.requisitionId },
      include: { items: true }
    });
    if (!req) throw Errors.notFound("Requisition", data.requisitionId);
    if (req.status !== RequisitionStatus.APPROVED) {
      throw Errors.conflict("Requisition must be APPROVED to create an SIV.");
    }

    const store = await tx.store.findUnique({ where: { id: data.storeId } });
    if (!store || store.status !== "ACTIVE" || store.deletedAt) {
      throw Errors.validation("Invalid or inactive source store.");
    }

    // Prepare arrays for bulk creation
    const sivItemsToCreate: any[] = [];
    
    // Process items and reserve stock
    for (const itemData of data.items) {
      const reqItem = req.items.find(i => i.itemId === itemData.itemId);
      if (!reqItem) {
        throw Errors.validation(`Item ${itemData.itemId} is not in the requisition.`);
      }
      
      const requestedRemaining = reqItem.quantity - reqItem.fulfilledQty;
      let totalAllocated = 0;

      const allocationsToCreate: any[] = [];

      for (const alloc of itemData.allocations) {
        if (alloc.quantity <= 0) throw Errors.validation("Allocation quantity must be positive.");
        
        totalAllocated += alloc.quantity;

        // Fetch BinStock
        const binStock = await tx.binStock.findUnique({
          where: { itemId_binId: { itemId: itemData.itemId, binId: alloc.binId } },
          include: { bin: { include: { shelf: true } } }
        });

        if (!binStock) {
          throw Errors.notFound("BinStock", alloc.binId);
        }
        if (binStock.bin.shelf.locationId.startsWith('')) {
           // We would ideally verify the bin's shelf's location belongs to storeId here.
           // A simpler check is fetching the storeLocation.
           const loc = await tx.storeLocation.findUnique({ where: { id: binStock.bin.shelf.locationId } });
           if (loc?.storeId !== data.storeId) {
             throw Errors.validation(`Bin ${binStock.bin.name} does not belong to store ${store.name}`);
           }
        }

        const available = binStock.quantity - binStock.reservedQty;
        if (alloc.quantity > available) {
          throw Errors.conflict(`Insufficient stock in Bin ${binStock.bin.name}. Available: ${available}, Requested: ${alloc.quantity}`);
        }

        // Reserve in BinStock with post-update concurrency check
        const updatedBinStock = await tx.binStock.update({
          where: { id: binStock.id },
          data: { reservedQty: { increment: alloc.quantity } }
        });
        
        if (updatedBinStock.reservedQty > updatedBinStock.quantity) {
          throw Errors.conflict(`Concurrent modification: Insufficient stock after reservation in Bin ${binStock.bin.name}.`);
        }

        allocationsToCreate.push({
          binId: alloc.binId,
          quantity: alloc.quantity
        });
      }

      if (totalAllocated > requestedRemaining) {
        throw Errors.conflict(`Cannot allocate more than requested remaining quantity for item ${itemData.itemId}`);
      }

      // Reserve in StoreStock
      const storeStock = await tx.storeStock.findUnique({
        where: { itemId_storeId: { itemId: itemData.itemId, storeId: data.storeId } }
      });
      if (!storeStock) throw Errors.notFound("StoreStock", itemData.itemId);
      
      const storeAvailable = storeStock.quantity - storeStock.reservedQty;
      if (totalAllocated > storeAvailable) {
         // This shouldn't theoretically happen if BinStocks were valid, but safety first.
         throw Errors.conflict(`Insufficient total store stock for item ${itemData.itemId}`);
      }

      // Reserve in StoreStock with post-update concurrency check
      const updatedStoreStock = await tx.storeStock.update({
        where: { id: storeStock.id },
        data: { reservedQty: { increment: totalAllocated } }
      });

      if (updatedStoreStock.reservedQty > updatedStoreStock.quantity) {
         throw Errors.conflict(`Concurrent modification: Insufficient total store stock for item ${itemData.itemId}`);
      }

      sivItemsToCreate.push({
        itemId: itemData.itemId,
        quantity: totalAllocated,
        approvedQty: totalAllocated,
        allocations: { create: allocationsToCreate }
      });
    }

    // Create SIV
    const isISIV = data.voucherType === "ISIV";
    const siv = await tx.storeIssueVoucher.create({
      data: {
        code: generateSIVCode(isISIV),
        requisitionId: req.id,
        storeId: store.id,
        destinationStoreId: isISIV ? data.destinationStoreId : null,
        voucherType: data.voucherType,
        createdById: ctx.userId!,
        status: SIVStatus.PRELIMINARY,
        notes: data.notes,
        items: {
          create: sivItemsToCreate
        }
      },
      include: { items: { include: { allocations: true } } }
    });

    await recordAudit({
      ctx, action: "CREATED", module: "sivs", entity: "siv", entityId: siv.id, newValue: siv
    });

    return siv;
  });
}

export async function submitSIV(id: string, ctx: AuditContext) {
  const siv = await getSIV(id);
  if (siv.status !== SIVStatus.PRELIMINARY && siv.status !== SIVStatus.AMENDMENT_REQUIRED) {
    throw Errors.conflict("Only PRELIMINARY or AMENDMENT_REQUIRED SIVs can be submitted.");
  }

  const updatedSiv = await prisma.storeIssueVoucher.update({
    where: { id },
    data: { status: SIVStatus.UNDER_APPROVAL }
  });

  return updatedSiv;
}

export async function approveSIV(id: string, ctx: AuditContext) {
  const siv = await getSIV(id);
  if (siv.status !== SIVStatus.UNDER_APPROVAL) {
    throw Errors.conflict("SIV must be UNDER_APPROVAL to be approved.");
  }

  const updatedSiv = await prisma.storeIssueVoucher.update({
    where: { id },
    data: { 
      status: SIVStatus.APPROVED,
      approvedById: ctx.userId!
    }
  });

  return updatedSiv;
}

export async function rejectSIV(id: string, ctx: AuditContext) {
  // Needs to release reservations
  return prisma.$transaction(async (tx) => {
    const siv = await tx.storeIssueVoucher.findUnique({
      where: { id },
      include: { items: { include: { allocations: true } } }
    });
    if (!siv) throw Errors.notFound("SIV", id);
    if (siv.status === SIVStatus.FINALIZED || siv.status === SIVStatus.ISSUED) {
      throw Errors.conflict("Cannot reject an already finalized SIV.");
    }
    if (siv.status === SIVStatus.REJECTED) {
      return siv;
    }

    // Release reservations
    for (const item of siv.items) {
      let totalAllocated = 0;
      for (const alloc of item.allocations) {
        totalAllocated += alloc.quantity;
        await tx.binStock.update({
          where: { itemId_binId: { itemId: item.itemId, binId: alloc.binId } },
          data: { reservedQty: { decrement: alloc.quantity } }
        });
      }
      
      await tx.storeStock.update({
        where: { itemId_storeId: { itemId: item.itemId, storeId: siv.storeId } },
        data: { reservedQty: { decrement: totalAllocated } }
      });
    }

    const updatedSiv = await tx.storeIssueVoucher.update({
      where: { id },
      data: { status: SIVStatus.REJECTED }
    });

    await recordAudit({ ctx, action: "UPDATED", module: "sivs", entity: "siv", entityId: siv.id });
    return updatedSiv;
  });
}

export async function finalizeSIV(id: string, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const siv = await tx.storeIssueVoucher.findUnique({
      where: { id },
      include: { items: { include: { allocations: { include: { bin: true } } } } }
    });
    if (!siv) throw Errors.notFound("SIV", id);

    // ATOMIC LOCK: Transition status strictly from APPROVED to FINALIZED to prevent concurrent double-finalization.
    const lock = await tx.storeIssueVoucher.updateMany({
      where: { id, status: SIVStatus.APPROVED },
      data: { status: SIVStatus.FINALIZED, issueDate: new Date() }
    });
    if (lock.count === 0) {
      throw Errors.conflict("SIV must be APPROVED to finalize. It may have already been finalized concurrently.");
    }

    for (const item of siv.items) {
      let totalIssued = 0;
      let totalCostAccumulated = 0;

      for (const alloc of item.allocations) {
        const binStock = await tx.binStock.findUnique({
          where: { itemId_binId: { itemId: item.itemId, binId: alloc.binId } }
        });
        if (!binStock) throw Errors.notFound("BinStock", alloc.binId);

        if (binStock.quantity < alloc.quantity || binStock.reservedQty < alloc.quantity) {
          throw Errors.conflict(`Physical or reserved stock mismatch for Bin ${alloc.bin.name}.`);
        }

        // 1 & 2. Decrease BinStock physical & reserved with concurrency check
        const updatedBinStock = await tx.binStock.update({
          where: { id: binStock.id },
          data: {
            quantity: { decrement: alloc.quantity },
            reservedQty: { decrement: alloc.quantity }
          }
        });
        if (updatedBinStock.quantity < 0 || updatedBinStock.reservedQty < 0) {
          throw Errors.conflict(`Concurrent modification: Stock fell below zero during finalization for Bin ${alloc.bin.name}.`);
        }

        // FIFO consumption (for cost)
        let allocCost = 0;
        let qtyToConsume = alloc.quantity;
        
        const fifoLayers = await tx.fifoLayer.findMany({
          where: { itemId: item.itemId, storeId: siv.storeId, remainingQty: { gt: 0 } },
          orderBy: { createdAt: "asc" }
        });

        for (const layer of fifoLayers) {
          if (qtyToConsume <= 0) break;
          const take = Math.min(layer.remainingQty, qtyToConsume);
          
          await tx.fifoLayer.update({
            where: { id: layer.id },
            data: { remainingQty: { decrement: take } }
          });
          
          allocCost += (take * layer.unitCost);
          qtyToConsume -= take;
        }

        const avgUnitCost = alloc.quantity > 0 ? (allocCost / alloc.quantity) : 0;
        totalCostAccumulated += allocCost;
        totalIssued += alloc.quantity;

        // 6. BinCard
        await tx.binCard.create({
          data: {
            binId: alloc.binId,
            itemId: item.itemId,
            transactionType: "ISSUE",
            referenceDoc: siv.code,
            outQty: alloc.quantity,
            balance: updatedBinStock.quantity
          }
        });
      }

      // 3 & 4. Decrease StoreStock with concurrency check
      const storeStock = await tx.storeStock.findUnique({
        where: { itemId_storeId: { itemId: item.itemId, storeId: siv.storeId } }
      });
      if (!storeStock) throw Errors.notFound("StoreStock", item.itemId);

      const updatedStoreStock = await tx.storeStock.update({
        where: { id: storeStock.id },
        data: {
          quantity: { decrement: totalIssued },
          reservedQty: { decrement: totalIssued }
        }
      });
      if (updatedStoreStock.quantity < 0 || updatedStoreStock.reservedQty < 0) {
        throw Errors.conflict(`Concurrent modification: Store stock fell below zero for item ${item.itemId}.`);
      }

      // 5. StockTransaction
      const unitCost = totalIssued > 0 ? (totalCostAccumulated / totalIssued) : 0;
      await tx.stockTransaction.create({
        data: {
          code: `TXN-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`,
          itemId: item.itemId,
          storeId: siv.storeId,
          type: TransactionType.ISSUE,
          quantity: -totalIssued,
          unitCost,
          balanceBefore: storeStock.quantity,
          balanceAfter: updatedStoreStock.quantity,
          referenceType: siv.voucherType,
          referenceId: siv.id,
          userId: ctx.userId!,
          remarks: "SIV Finalization"
        }
      });

      // 7. StockCard
      await tx.stockCard.create({
        data: {
          storeId: siv.storeId,
          itemId: item.itemId,
          transactionType: "ISSUE",
          referenceDoc: siv.code,
          outQty: totalIssued,
          balance: updatedStoreStock.quantity
        }
      });

      // Update SIV Item with final qty/cost
      await tx.sIVItem.update({
        where: { id: item.id },
        data: { issuedQty: totalIssued, unitCost }
      });

      // 9. Update Requisition fulfilledQty
      if (siv.requisitionId) {
        const reqItem = await tx.requisitionItem.findFirst({
          where: { requisitionId: siv.requisitionId, itemId: item.itemId }
        });
        if (reqItem) {
          await tx.requisitionItem.update({
            where: { id: reqItem.id },
            data: { fulfilledQty: { increment: totalIssued } }
          });
        }
      }
    }

    // 8. (SIV status already updated atomically at the beginning of the transaction)

    // 10. Check if requisition is fully fulfilled
    if (siv.requisitionId) {
      const req = await tx.requisition.findUnique({
        where: { id: siv.requisitionId },
        include: { items: true }
      });
      if (req) {
        const fullyFulfilled = req.items.every(i => i.fulfilledQty >= i.quantity);
        const partiallyFulfilled = req.items.some(i => i.fulfilledQty > 0);
        
        let newStatus = req.status;
        if (fullyFulfilled) {
          newStatus = RequisitionStatus.FULFILLED;
        } else if (partiallyFulfilled) {
          newStatus = RequisitionStatus.PARTIALLY_FULFILLED;
        }

        if (newStatus !== req.status) {
          await tx.requisition.update({
            where: { id: req.id },
            data: { status: newStatus }
          });
        }
      }
    }

    await recordAudit({ ctx, action: "UPDATED", module: "sivs", entity: "siv", entityId: siv.id });
    
    // Return updated siv details (fetch again or construct)
    return tx.storeIssueVoucher.findUnique({ where: { id } });
  });
}

// Amendment function releasing old reservations and reserving new ones
export async function amendSIV(id: string, data: any, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  return prisma.$transaction(async (tx) => {
    const siv = await tx.storeIssueVoucher.findUnique({
      where: { id },
      include: { items: { include: { allocations: true } } }
    });
    if (!siv) throw Errors.notFound("SIV", id);
    if (siv.status === SIVStatus.FINALIZED || siv.status === SIVStatus.ISSUED) {
      throw Errors.conflict("Cannot amend an already finalized SIV.");
    }

    // 1. Release old reservations
    for (const item of siv.items) {
      let oldTotal = 0;
      for (const alloc of item.allocations) {
        oldTotal += alloc.quantity;
        await tx.binStock.update({
          where: { itemId_binId: { itemId: item.itemId, binId: alloc.binId } },
          data: { reservedQty: { decrement: alloc.quantity } }
        });
      }
      await tx.storeStock.update({
        where: { itemId_storeId: { itemId: item.itemId, storeId: siv.storeId } },
        data: { reservedQty: { decrement: oldTotal } }
      });
    }

    // Clear old items and allocations completely
    await tx.sIVItem.deleteMany({ where: { sivId: id } });

    // 2. Process new items and apply new reservations
    const req = await tx.requisition.findUnique({
      where: { id: siv.requisitionId! },
      include: { items: true }
    });

    const sivItemsToCreate: any[] = [];
    
    for (const itemData of data.items) {
      const reqItem = req?.items.find(i => i.itemId === itemData.itemId);
      if (req && !reqItem) {
        throw Errors.validation(`Item ${itemData.itemId} is not in the requisition.`);
      }
      
      const requestedRemaining = reqItem ? reqItem.quantity - reqItem.fulfilledQty : Infinity;
      let totalAllocated = 0;
      const allocationsToCreate: any[] = [];

      for (const alloc of itemData.allocations) {
        if (alloc.quantity <= 0) throw Errors.validation("Allocation quantity must be positive.");
        
        totalAllocated += alloc.quantity;

        const binStock = await tx.binStock.findUnique({
          where: { itemId_binId: { itemId: itemData.itemId, binId: alloc.binId } }
        });
        if (!binStock) throw Errors.notFound("BinStock", alloc.binId);

        const available = binStock.quantity - binStock.reservedQty;
        if (alloc.quantity > available) {
          throw Errors.conflict(`Insufficient stock in Bin for amendment. Available: ${available}, Requested: ${alloc.quantity}`);
        }

        await tx.binStock.update({
          where: { id: binStock.id },
          data: { reservedQty: { increment: alloc.quantity } }
        });

        allocationsToCreate.push({ binId: alloc.binId, quantity: alloc.quantity });
      }

      if (totalAllocated > requestedRemaining) {
        throw Errors.conflict(`Cannot allocate more than requested remaining quantity for item ${itemData.itemId}`);
      }

      const storeStock = await tx.storeStock.findUnique({
        where: { itemId_storeId: { itemId: itemData.itemId, storeId: siv.storeId } }
      });
      if (!storeStock) throw Errors.notFound("StoreStock", itemData.itemId);
      
      const storeAvailable = storeStock.quantity - storeStock.reservedQty;
      if (totalAllocated > storeAvailable) throw Errors.conflict(`Insufficient total store stock for item ${itemData.itemId}`);

      await tx.storeStock.update({
        where: { id: storeStock.id },
        data: { reservedQty: { increment: totalAllocated } }
      });

      sivItemsToCreate.push({
        itemId: itemData.itemId,
        quantity: totalAllocated,
        approvedQty: totalAllocated,
        allocations: { create: allocationsToCreate }
      });
    }

    // 3. Update SIV
    const updatedSiv = await tx.storeIssueVoucher.update({
      where: { id },
      data: { 
        status: SIVStatus.PRELIMINARY,
        notes: data.notes,
        items: { create: sivItemsToCreate }
      },
      include: { items: { include: { allocations: true } } }
    });

    await recordAudit({ ctx, action: "UPDATED", module: "sivs", entity: "siv", entityId: siv.id });
    return updatedSiv;
  });
}
