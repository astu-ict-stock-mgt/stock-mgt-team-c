import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { recordAudit, AuditContext } from "./audit";

// Helpers
function generateGRNCode(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `GRN-${dateStr}-${rand}`;
}

export async function generateGRN(receiptId: string, notes: string | undefined, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  const receipt = await prisma.goodsReceipt.findUnique({
    where: { id: receiptId },
    include: {
      items: {
        include: {
          evaluationItem: true
        }
      },
      evaluation: true,
      grn: true
    }
  });

  if (!receipt) throw Errors.notFound("Receipt");
  
  if (receipt.grn) {
    throw Errors.validation("GRN already generated for this receipt", "ALREADY_GENERATED");
  }

  if (receipt.status !== "ACCEPTED") {
    throw Errors.validation("Receipt must be evaluated and ACCEPTED before generating GRN", "INVALID_STATE");
  }

  // The evaluation must exist and not be REJECTED overall
  if (!receipt.evaluation || receipt.evaluation.decision === "REJECTED") {
    throw Errors.validation("Receipt evaluation is missing or rejected", "INVALID_EVALUATION");
  }

  // CRITICAL ATOMIC TRANSACTION
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create GRN record
    const grnCode = generateGRNCode();
    const grn = await tx.gRN.create({
      data: {
        code: grnCode,
        receiptId: receipt.id,
        generatedById: ctx.userId!,
        notes: notes
      }
    });

    // 2. Loop through accepted items to mutate stock
    for (const item of receipt.items) {
      const evalItem = item.evaluationItem;
      if (!evalItem || evalItem.acceptedQuantity <= 0) continue; // Skip if rejected completely or not evaluated

      const qty = evalItem.acceptedQuantity;
      
      // Update StoreStock
      const storeStock = await tx.storeStock.upsert({
        where: {
          itemId_storeId: {
            itemId: item.itemId,
            storeId: receipt.storeId
          }
        },
        create: {
          itemId: item.itemId,
          storeId: receipt.storeId,
          quantity: qty
        },
        update: {
          quantity: { increment: qty }
        }
      });

      // Update BinStock if bin is provided
      let binStockBalance = 0;
      if (item.binId) {
        // Validate bin belongs to the receiving store's locations
        const bin = await tx.bin.findUnique({
          where: { id: item.binId },
          include: { shelf: { include: { location: true } } }
        });

        if (!bin || bin.shelf.location.storeId !== receipt.storeId) {
          throw Errors.validation(`Bin ${item.binId} does not belong to store ${receipt.storeId}`, "INVALID_BIN");
        }

        const binStock = await tx.binStock.upsert({
          where: {
            itemId_binId: {
              itemId: item.itemId,
              binId: item.binId
            }
          },
          create: {
            itemId: item.itemId,
            binId: item.binId,
            quantity: qty
          },
          update: {
            quantity: { increment: qty }
          }
        });
        binStockBalance = binStock.quantity;
      }

      // Create FifoLayer
      await tx.fifoLayer.create({
        data: {
          itemId: item.itemId,
          storeId: receipt.storeId,
          grnId: grn.id,
          originalQty: qty,
          remainingQty: qty,
          unitCost: item.unitCost
        }
      });

      // Create StockTransaction
      const transactionDate = new Date();
      const codeStr = `TXN-${transactionDate.toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      await tx.stockTransaction.create({
        data: {
          code: codeStr,
          itemId: item.itemId,
          storeId: receipt.storeId,
          type: "RECEIPT",
          quantity: qty,
          unitCost: item.unitCost,
          balanceBefore: storeStock.quantity - qty, // Because storeStock object has updated value
          balanceAfter: storeStock.quantity,
          referenceType: "GRN",
          referenceId: grn.id,
          userId: ctx.userId!,
          remarks: "Generated via GRN"
        }
      });

      // Update StockCard
      await tx.stockCard.create({
        data: {
          storeId: receipt.storeId,
          itemId: item.itemId,
          transactionType: "RECEIPT",
          referenceDoc: grn.code,
          inQty: qty,
          outQty: 0,
          balance: storeStock.quantity
        }
      });

      // Update BinCard if applicable
      if (item.binId) {
        await tx.binCard.create({
          data: {
            binId: item.binId,
            itemId: item.itemId,
            transactionType: "RECEIPT",
            referenceDoc: grn.code,
            inQty: qty,
            outQty: 0,
            balance: binStockBalance
          }
        });
      }
    }

    // Mark Receipt as GRN_GENERATED
    await tx.goodsReceipt.update({
      where: { id: receipt.id },
      data: { status: "GRN_GENERATED" }
    });

    return grn;
  });

  await recordAudit({
    ctx,
    action: "GENERATE_GRN",
    module: "RECEIPTS",
    entity: "GRN",
    entityId: result.id,
    newValue: result
  });

  return result;
}

export async function listGRNs(params: { storeId?: string, search?: string }) {
  const where: any = {};
  
  if (params.storeId) {
    where.receipt = { storeId: params.storeId };
  }
  
  if (params.search) {
    where.OR = [
      { code: { contains: params.search, mode: "insensitive" } },
      { receipt: { code: { contains: params.search, mode: "insensitive" } } }
    ];
  }

  return prisma.gRN.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      receipt: {
        include: {
          supplier: true,
          store: true
        }
      },
      generatedBy: { select: { id: true, fullName: true, username: true } }
    }
  });
}

export async function getGRN(id: string) {
  const grn = await prisma.gRN.findUnique({
    where: { id },
    include: {
      receipt: {
        include: {
          supplier: true,
          store: true,
          items: {
            include: {
              item: true,
              bin: true,
              evaluationItem: true
            }
          }
        }
      },
      generatedBy: { select: { id: true, fullName: true, username: true } },
      fifoLayers: true
    }
  });

  if (!grn) throw Errors.notFound("GRN");
  return grn;
}
