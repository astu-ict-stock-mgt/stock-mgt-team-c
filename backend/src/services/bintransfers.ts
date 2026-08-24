import { BinTransferStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { recordAudit, AuditContext } from "./audit";

function generateBinTransferCode(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `BTR-${dateStr}-${rand}`;
}

export async function executeBinTransfer(data: { itemId: string, fromBinId: string, toBinId: string, quantity: number }, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();
  if (data.quantity <= 0) throw Errors.validation("Transfer quantity must be greater than zero.");
  if (data.fromBinId === data.toBinId) throw Errors.validation("Source and destination bins cannot be the same.");

  return prisma.$transaction(async (tx) => {
    // 1. Fetch both bins and verify they belong to the same store
    const [fromBin, toBin] = await Promise.all([
      tx.bin.findUnique({ where: { id: data.fromBinId }, include: { shelf: { include: { location: true } } } }),
      tx.bin.findUnique({ where: { id: data.toBinId }, include: { shelf: { include: { location: true } } } })
    ]);

    if (!fromBin) throw Errors.notFound("Bin", data.fromBinId);
    if (!toBin) throw Errors.notFound("Bin", data.toBinId);

    const fromStoreId = fromBin.shelf.location.storeId;
    const toStoreId = toBin.shelf.location.storeId;

    if (fromStoreId !== toStoreId) {
      throw Errors.validation("Internal bin transfers must occur within the same store. Use Inter-Store Transfer for different stores.");
    }

    // 2. Fetch source bin stock
    const sourceBinStock = await tx.binStock.findUnique({
      where: { itemId_binId: { itemId: data.itemId, binId: data.fromBinId } }
    });
    if (!sourceBinStock) {
      throw Errors.validation(`No stock found for item ${data.itemId} in source bin ${fromBin.name}.`);
    }

    const availableQty = sourceBinStock.quantity - sourceBinStock.reservedQty;
    if (availableQty < data.quantity) {
      throw Errors.validation(`Insufficient available stock in source bin. Available: ${availableQty}, Requested: ${data.quantity}`);
    }

    const code = generateBinTransferCode();

    // 3. Decrement source bin stock
    const updatedSourceBinStock = await tx.binStock.update({
      where: { id: sourceBinStock.id },
      data: { quantity: { decrement: data.quantity } }
    });

    if (updatedSourceBinStock.quantity < 0) {
      throw Errors.conflict("Source bin stock fell below zero during bin transfer.");
    }

    // 4. Increment destination bin stock
    const updatedDestBinStock = await tx.binStock.upsert({
      where: { itemId_binId: { itemId: data.itemId, binId: data.toBinId } },
      create: { itemId: data.itemId, binId: data.toBinId, quantity: data.quantity, reservedQty: 0 },
      update: { quantity: { increment: data.quantity } }
    });

    // 5. Create BinCard entries (OUT from source, IN to destination)
    await tx.binCard.create({
      data: {
        binId: data.fromBinId,
        itemId: data.itemId,
        transactionType: "TRANSFER_OUT",
        referenceDoc: code,
        outQty: data.quantity,
        balance: updatedSourceBinStock.quantity
      }
    });

    await tx.binCard.create({
      data: {
        binId: data.toBinId,
        itemId: data.itemId,
        transactionType: "TRANSFER_IN",
        referenceDoc: code,
        inQty: data.quantity,
        balance: updatedDestBinStock.quantity
      }
    });

    // 6. Create BinTransfer record
    const btr = await tx.binTransfer.create({
      data: {
        code,
        storeId: fromStoreId,
        itemId: data.itemId,
        fromBinId: data.fromBinId,
        toBinId: data.toBinId,
        quantity: data.quantity,
        requestedById: ctx.userId,
        status: BinTransferStatus.EXECUTED
      }
    });

    await recordAudit({ ctx, action: "EXECUTED", module: "bintransfers", entity: "bintransfer", entityId: btr.id });

    return btr;
  });
}
