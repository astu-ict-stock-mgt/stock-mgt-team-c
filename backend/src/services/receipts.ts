import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { recordAudit, AuditContext } from "./audit";
import { Prisma } from "@prisma/client";

// Helpers
function generateReceiptCode(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RECP-${dateStr}-${rand}`;
}

export async function createReceipt(data: any, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  // Validate Store
  const store = await prisma.store.findUnique({ where: { id: data.storeId } });
  if (!store) throw Errors.badRequest("STORE_NOT_FOUND", "Invalid store ID");

  // Validate Supplier
  const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
  if (!supplier) throw Errors.badRequest("SUPPLIER_NOT_FOUND", "Invalid supplier ID");

  // Create Draft Receipt
  const receipt = await prisma.goodsReceipt.create({
    data: {
      code: generateReceiptCode(),
      supplierId: data.supplierId,
      storeId: data.storeId,
      receivedById: ctx.userId,
      status: "DRAFT",
      deliveryNote: data.deliveryNote,
      purchaseOrder: data.purchaseOrder,
      inspectionNotes: data.inspectionNotes,
      items: {
        create: data.items.map((item: any) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          condition: item.condition,
          binId: item.binId,
          remarks: item.remarks
        }))
      }
    },
    include: { items: true }
  });

  await recordAudit({
    ctx,
    action: "CREATE",
    module: "RECEIPTS",
    entity: "GoodsReceipt",
    entityId: receipt.id,
    newValue: receipt
  });

  return receipt;
}

export async function updateReceipt(id: string, data: any, ctx: AuditContext) {
  const receipt = await prisma.goodsReceipt.findUnique({ where: { id }, include: { items: true } });
  if (!receipt) throw Errors.notFound("Receipt not found");
  if (receipt.status !== "DRAFT") throw Errors.badRequest("INVALID_STATE", "Only DRAFT receipts can be updated");

  // To update items properly, we delete existing and recreate, or we map them. 
  // For simplicity, if items are provided, we delete all and recreate.
  const updateData: Prisma.GoodsReceiptUpdateInput = {
    deliveryNote: data.deliveryNote !== undefined ? data.deliveryNote : receipt.deliveryNote,
    purchaseOrder: data.purchaseOrder !== undefined ? data.purchaseOrder : receipt.purchaseOrder,
    inspectionNotes: data.inspectionNotes !== undefined ? data.inspectionNotes : receipt.inspectionNotes,
  };

  if (data.supplierId) {
    updateData.supplier = { connect: { id: data.supplierId } };
  }
  if (data.storeId) {
    updateData.store = { connect: { id: data.storeId } };
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (data.items) {
      await tx.goodsReceiptItem.deleteMany({ where: { receiptId: id } });
      updateData.items = {
        create: data.items.map((item: any) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          condition: item.condition,
          binId: item.binId,
          remarks: item.remarks
        }))
      };
    }
    return tx.goodsReceipt.update({
      where: { id },
      data: updateData,
      include: { items: true }
    });
  });

  await recordAudit({
    ctx,
    action: "UPDATE",
    module: "RECEIPTS",
    entity: "GoodsReceipt",
    entityId: id,
    oldValue: receipt,
    newValue: updated
  });

  return updated;
}

export async function submitReceipt(id: string, ctx: AuditContext) {
  const receipt = await prisma.goodsReceipt.findUnique({ where: { id } });
  if (!receipt) throw Errors.notFound("Receipt not found");
  if (receipt.status !== "DRAFT") throw Errors.badRequest("INVALID_STATE", "Only DRAFT receipts can be submitted");

  const updated = await prisma.goodsReceipt.update({
    where: { id },
    data: { status: "SUBMITTED" }
  });

  await recordAudit({
    ctx,
    action: "SUBMIT",
    module: "RECEIPTS",
    entity: "GoodsReceipt",
    entityId: id,
    oldValue: receipt,
    newValue: updated
  });

  return updated;
}

export async function listReceipts(params: { status?: string, storeId?: string, supplierId?: string, search?: string }) {
  const where: Prisma.GoodsReceiptWhereInput = {};
  
  if (params.status) where.status = params.status as any;
  if (params.storeId) where.storeId = params.storeId;
  if (params.supplierId) where.supplierId = params.supplierId;
  if (params.search) {
    where.OR = [
      { code: { contains: params.search, mode: "insensitive" } },
      { deliveryNote: { contains: params.search, mode: "insensitive" } },
      { purchaseOrder: { contains: params.search, mode: "insensitive" } }
    ];
  }

  return prisma.goodsReceipt.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      supplier: { select: { id: true, name: true, code: true } },
      store: { select: { id: true, name: true, code: true } },
      receivedBy: { select: { id: true, fullName: true, username: true } },
      _count: { select: { items: true } }
    }
  });
}

export async function getReceipt(id: string) {
  const receipt = await prisma.goodsReceipt.findUnique({
    where: { id },
    include: {
      supplier: { select: { id: true, name: true, code: true } },
      store: { select: { id: true, name: true, code: true } },
      receivedBy: { select: { id: true, fullName: true, username: true } },
      items: {
        include: {
          item: { select: { id: true, name: true, code: true, uom: true } },
          bin: { select: { id: true, name: true, code: true } },
          evaluationItem: true
        }
      },
      evaluation: true,
      grn: true
    }
  });

  if (!receipt) throw Errors.notFound("Receipt not found");
  return receipt;
}
