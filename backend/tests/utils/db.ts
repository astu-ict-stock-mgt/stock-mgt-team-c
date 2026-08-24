import { PrismaClient } from "@prisma/client";
import { prisma } from "../../src/config/db";

export async function clearDatabase() {
  // We must delete in reverse dependency order to avoid foreign key violations.

  // 1. Transactional/Workflow Records
  await prisma.fifoLayer.deleteMany();
  await prisma.binCard.deleteMany();
  await (prisma as any).stockCard.deleteMany();
  await (prisma as any).stockTransaction.deleteMany();

  // 2. Returns, Transfers & Bin Transfers (Phase 5)
  await prisma.returnBinAllocation.deleteMany();
  await prisma.storeReturnItem.deleteMany();
  await prisma.storeReturnNote.deleteMany();
  await prisma.transferOutBinAllocation.deleteMany();
  await prisma.transferInBinAllocation.deleteMany();
  await prisma.transferRequestItem.deleteMany();
  await prisma.transferRequest.deleteMany();
  await prisma.binTransfer.deleteMany();

  // 3. Issue Vouchers & Allocations
  await (prisma as any).sIVBinAllocation.deleteMany();
  await (prisma as any).sIVItem.deleteMany();
  await (prisma as any).storeIssueVoucher.deleteMany();

  // 3. Requisitions
  await (prisma as any).requisitionApproval.deleteMany();
  await (prisma as any).requisitionItem.deleteMany();
  await (prisma as any).requisition.deleteMany();

  // 4. Receiving & Technical Evaluation
  await (prisma as any).gRN.deleteMany();
  await (prisma as any).technicalEvaluationItem.deleteMany();
  await (prisma as any).technicalEvaluation.deleteMany();
  await (prisma as any).goodsReceiptItem.deleteMany();
  await (prisma as any).goodsReceipt.deleteMany();

  // 5. Stock Physical Records
  await (prisma as any).binStock.deleteMany();
  await (prisma as any).storeStock.deleteMany();

  // 6. Master Data - Store Hierarchy
  await (prisma as any).bin.deleteMany();
  await (prisma as any).shelf.deleteMany();
  await (prisma as any).storeLocation.deleteMany();
  await prisma.store.deleteMany();

  // 7. Master Data - Items and Suppliers
  await (prisma as any).inventoryItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.unitOfMeasure.deleteMany();
  await (prisma as any).supplier.deleteMany();

  // 8. Users, Roles, Sessions & Audit
  await (prisma as any).auditLog.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.userRole.deleteMany();
  await (prisma as any).rolePermission.deleteMany();
  await prisma.role.deleteMany();
  await (prisma as any).permission.deleteMany();
  await prisma.user.deleteMany();
}
