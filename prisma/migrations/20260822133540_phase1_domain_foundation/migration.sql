-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED', 'PENDING');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLACKLISTED');

-- CreateEnum
CREATE TYPE "StoreStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('CONSUMABLE', 'NON_CONSUMABLE', 'FIXED_ASSET', 'OTHER');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK', 'DAMAGED', 'OBSOLETE', 'DISPOSED');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_EVALUATION', 'ACCEPTED', 'REJECTED', 'GRN_GENERATED');

-- CreateEnum
CREATE TYPE "EvaluationDecision" AS ENUM ('APPROVED', 'REJECTED', 'APPROVED_WITH_CONDITIONS', 'PENDING');

-- CreateEnum
CREATE TYPE "RequisitionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('APPROVED', 'REJECTED', 'RETURNED_FOR_CORRECTION');

-- CreateEnum
CREATE TYPE "SIVStatus" AS ENUM ('DRAFT', 'PRELIMINARY', 'UNDER_APPROVAL', 'AMENDMENT_REQUIRED', 'APPROVED', 'FINALIZED', 'ISSUED');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_EVALUATION', 'APPROVED', 'REJECTED', 'POSTED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'DISPATCHED', 'RECEIVED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DisposalStatus" AS ENUM ('FLAGGED', 'REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXECUTED');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('IN_STORE', 'IN_USE', 'MAINTENANCE', 'DISPOSED', 'LOST');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('OPENING', 'RECEIPT', 'ISSUE', 'RETURN', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE', 'OBSOLETE', 'DISPOSAL');

-- CreateEnum
CREATE TYPE "StockTakeStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'RECONCILED');

-- CreateEnum
CREATE TYPE "GatePassStatus" AS ENUM ('PENDING', 'APPROVED', 'EXIT_CONFIRMED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "department" TEXT,
    "phoneNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refresh" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitOfMeasure" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnitOfMeasure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "department" TEXT,
    "location" TEXT,
    "status" "StoreStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreLocation" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shelf" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shelf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bin" (
    "id" TEXT NOT NULL,
    "shelfId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "uomId" TEXT NOT NULL,
    "materialType" "MaterialType" NOT NULL DEFAULT 'CONSUMABLE',
    "status" "ItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "minStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "safetyStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorderLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hasShelfLife" BOOLEAN NOT NULL DEFAULT false,
    "shelfLifeDays" INTEGER,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreStock" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reservedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BinStock" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reservedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BinStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FifoLayer" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "grnId" TEXT,
    "batchNumber" TEXT,
    "manufactureDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "originalQty" DOUBLE PRECISION NOT NULL,
    "remainingQty" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FifoLayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceipt" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "receivedById" TEXT NOT NULL,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'DRAFT',
    "deliveryNote" TEXT,
    "purchaseOrder" TEXT,
    "inspectionNotes" TEXT,
    "receiptDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceiptItem" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "GoodsReceiptItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicalEvaluation" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT,
    "returnId" TEXT,
    "evaluatorId" TEXT NOT NULL,
    "decision" "EvaluationDecision" NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TechnicalEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GRN" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GRN_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requisition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "status" "RequisitionStatus" NOT NULL DEFAULT 'DRAFT',
    "requiredDate" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Requisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequisitionItem" (
    "id" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "fulfilledQty" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "RequisitionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequisitionApproval" (
    "id" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL,
    "comments" TEXT,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequisitionApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreIssueVoucher" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "requisitionId" TEXT,
    "storeId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "status" "SIVStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreIssueVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SIVItem" (
    "id" TEXT NOT NULL,
    "sivId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "approvedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "issuedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "SIVItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreReturnNote" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "originalSivId" TEXT,
    "status" "ReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreReturnNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreReturnItem" (
    "id" TEXT NOT NULL,
    "srnId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "condition" TEXT,

    CONSTRAINT "StoreReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferRequest" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fromStoreId" TEXT NOT NULL,
    "toStoreId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferRequestItem" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TransferRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisposalRequest" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "DisposalStatus" NOT NULL DEFAULT 'FLAGGED',
    "reason" TEXT,
    "method" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisposalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisposalItem" (
    "id" TEXT NOT NULL,
    "disposalId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "condition" TEXT,

    CONSTRAINT "DisposalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedAsset" (
    "id" TEXT NOT NULL,
    "assetNumber" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "serialNumber" TEXT,
    "grnId" TEXT,
    "responsibleUserId" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'IN_USE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransaction" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceBefore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceAfter" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "userId" TEXT NOT NULL,
    "remarks" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockCard" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transactionType" TEXT NOT NULL,
    "referenceDoc" TEXT,
    "inQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BinCard" (
    "id" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transactionType" TEXT NOT NULL,
    "referenceDoc" TEXT,
    "inQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BinCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTake" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "conductedById" TEXT NOT NULL,
    "status" "StockTakeStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockTake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTakeItem" (
    "id" TEXT NOT NULL,
    "stockTakeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "systemQty" DOUBLE PRECISION NOT NULL,
    "physicalQty" DOUBLE PRECISION,
    "variance" DOUBLE PRECISION,
    "remarks" TEXT,

    CONSTRAINT "StockTakeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatePass" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sivId" TEXT,
    "requestedById" TEXT NOT NULL,
    "securityOfficerId" TEXT,
    "status" "GatePassStatus" NOT NULL DEFAULT 'PENDING',
    "carrier" TEXT,
    "vehiclePlate" TEXT,
    "exitConfirmedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GatePass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "ipAddress" TEXT,
    "description" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_token_key" ON "UserSession"("token");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_refresh_key" ON "UserSession"("refresh");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");

-- CreateIndex
CREATE INDEX "Supplier_status_idx" ON "Supplier"("status");

-- CreateIndex
CREATE INDEX "Supplier_deletedAt_idx" ON "Supplier"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Category_code_key" ON "Category"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "UnitOfMeasure_code_key" ON "UnitOfMeasure"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UnitOfMeasure_name_key" ON "UnitOfMeasure"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Store_code_key" ON "Store"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Store_name_key" ON "Store"("name");

-- CreateIndex
CREATE INDEX "Store_status_idx" ON "Store"("status");

-- CreateIndex
CREATE INDEX "Store_deletedAt_idx" ON "Store"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoreLocation_storeId_code_key" ON "StoreLocation"("storeId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Shelf_locationId_code_key" ON "Shelf"("locationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Bin_shelfId_code_key" ON "Bin"("shelfId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_code_key" ON "InventoryItem"("code");

-- CreateIndex
CREATE INDEX "InventoryItem_categoryId_idx" ON "InventoryItem"("categoryId");

-- CreateIndex
CREATE INDEX "InventoryItem_status_idx" ON "InventoryItem"("status");

-- CreateIndex
CREATE INDEX "InventoryItem_deletedAt_idx" ON "InventoryItem"("deletedAt");

-- CreateIndex
CREATE INDEX "StoreStock_storeId_idx" ON "StoreStock"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreStock_itemId_storeId_key" ON "StoreStock"("itemId", "storeId");

-- CreateIndex
CREATE INDEX "BinStock_binId_idx" ON "BinStock"("binId");

-- CreateIndex
CREATE UNIQUE INDEX "BinStock_itemId_binId_key" ON "BinStock"("itemId", "binId");

-- CreateIndex
CREATE INDEX "FifoLayer_itemId_storeId_createdAt_idx" ON "FifoLayer"("itemId", "storeId", "createdAt");

-- CreateIndex
CREATE INDEX "FifoLayer_grnId_idx" ON "FifoLayer"("grnId");

-- CreateIndex
CREATE INDEX "FifoLayer_expiryDate_idx" ON "FifoLayer"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceipt_code_key" ON "GoodsReceipt"("code");

-- CreateIndex
CREATE INDEX "GoodsReceipt_supplierId_idx" ON "GoodsReceipt"("supplierId");

-- CreateIndex
CREATE INDEX "GoodsReceipt_storeId_idx" ON "GoodsReceipt"("storeId");

-- CreateIndex
CREATE INDEX "GoodsReceiptItem_receiptId_idx" ON "GoodsReceiptItem"("receiptId");

-- CreateIndex
CREATE UNIQUE INDEX "TechnicalEvaluation_receiptId_key" ON "TechnicalEvaluation"("receiptId");

-- CreateIndex
CREATE UNIQUE INDEX "TechnicalEvaluation_returnId_key" ON "TechnicalEvaluation"("returnId");

-- CreateIndex
CREATE UNIQUE INDEX "GRN_code_key" ON "GRN"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GRN_receiptId_key" ON "GRN"("receiptId");

-- CreateIndex
CREATE UNIQUE INDEX "Requisition_code_key" ON "Requisition"("code");

-- CreateIndex
CREATE INDEX "Requisition_status_idx" ON "Requisition"("status");

-- CreateIndex
CREATE INDEX "Requisition_requestedById_idx" ON "Requisition"("requestedById");

-- CreateIndex
CREATE INDEX "RequisitionItem_requisitionId_idx" ON "RequisitionItem"("requisitionId");

-- CreateIndex
CREATE INDEX "RequisitionApproval_requisitionId_idx" ON "RequisitionApproval"("requisitionId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreIssueVoucher_code_key" ON "StoreIssueVoucher"("code");

-- CreateIndex
CREATE INDEX "StoreIssueVoucher_storeId_idx" ON "StoreIssueVoucher"("storeId");

-- CreateIndex
CREATE INDEX "StoreIssueVoucher_status_idx" ON "StoreIssueVoucher"("status");

-- CreateIndex
CREATE INDEX "SIVItem_sivId_idx" ON "SIVItem"("sivId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreReturnNote_code_key" ON "StoreReturnNote"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TransferRequest_code_key" ON "TransferRequest"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DisposalRequest_code_key" ON "DisposalRequest"("code");

-- CreateIndex
CREATE UNIQUE INDEX "FixedAsset_assetNumber_key" ON "FixedAsset"("assetNumber");

-- CreateIndex
CREATE UNIQUE INDEX "UserCard_userId_key" ON "UserCard"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StockTransaction_code_key" ON "StockTransaction"("code");

-- CreateIndex
CREATE INDEX "StockTransaction_itemId_transactionDate_idx" ON "StockTransaction"("itemId", "transactionDate");

-- CreateIndex
CREATE INDEX "StockTransaction_storeId_idx" ON "StockTransaction"("storeId");

-- CreateIndex
CREATE INDEX "StockTransaction_type_idx" ON "StockTransaction"("type");

-- CreateIndex
CREATE INDEX "StockTransaction_referenceType_referenceId_idx" ON "StockTransaction"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "StockCard_storeId_itemId_transactionDate_idx" ON "StockCard"("storeId", "itemId", "transactionDate");

-- CreateIndex
CREATE INDEX "BinCard_binId_itemId_transactionDate_idx" ON "BinCard"("binId", "itemId", "transactionDate");

-- CreateIndex
CREATE UNIQUE INDEX "StockTake_code_key" ON "StockTake"("code");

-- CreateIndex
CREATE INDEX "StockTake_status_idx" ON "StockTake"("status");

-- CreateIndex
CREATE INDEX "StockTake_storeId_idx" ON "StockTake"("storeId");

-- CreateIndex
CREATE INDEX "StockTakeItem_stockTakeId_idx" ON "StockTakeItem"("stockTakeId");

-- CreateIndex
CREATE UNIQUE INDEX "GatePass_code_key" ON "GatePass"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GatePass_sivId_key" ON "GatePass"("sivId");

-- CreateIndex
CREATE INDEX "GatePass_status_idx" ON "GatePass"("status");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_module_idx" ON "AuditLog"("module");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreLocation" ADD CONSTRAINT "StoreLocation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shelf" ADD CONSTRAINT "Shelf_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StoreLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bin" ADD CONSTRAINT "Bin_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES "Shelf"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_uomId_fkey" FOREIGN KEY ("uomId") REFERENCES "UnitOfMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreStock" ADD CONSTRAINT "StoreStock_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreStock" ADD CONSTRAINT "StoreStock_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BinStock" ADD CONSTRAINT "BinStock_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BinStock" ADD CONSTRAINT "BinStock_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FifoLayer" ADD CONSTRAINT "FifoLayer_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FifoLayer" ADD CONSTRAINT "FifoLayer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FifoLayer" ADD CONSTRAINT "FifoLayer_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GRN"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "GoodsReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalEvaluation" ADD CONSTRAINT "TechnicalEvaluation_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "GoodsReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalEvaluation" ADD CONSTRAINT "TechnicalEvaluation_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "StoreReturnNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalEvaluation" ADD CONSTRAINT "TechnicalEvaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GRN" ADD CONSTRAINT "GRN_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "GoodsReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GRN" ADD CONSTRAINT "GRN_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionItem" ADD CONSTRAINT "RequisitionItem_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "Requisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionItem" ADD CONSTRAINT "RequisitionItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionApproval" ADD CONSTRAINT "RequisitionApproval_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "Requisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionApproval" ADD CONSTRAINT "RequisitionApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreIssueVoucher" ADD CONSTRAINT "StoreIssueVoucher_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "Requisition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreIssueVoucher" ADD CONSTRAINT "StoreIssueVoucher_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreIssueVoucher" ADD CONSTRAINT "StoreIssueVoucher_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreIssueVoucher" ADD CONSTRAINT "StoreIssueVoucher_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SIVItem" ADD CONSTRAINT "SIVItem_sivId_fkey" FOREIGN KEY ("sivId") REFERENCES "StoreIssueVoucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SIVItem" ADD CONSTRAINT "SIVItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreReturnNote" ADD CONSTRAINT "StoreReturnNote_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreReturnItem" ADD CONSTRAINT "StoreReturnItem_srnId_fkey" FOREIGN KEY ("srnId") REFERENCES "StoreReturnNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreReturnItem" ADD CONSTRAINT "StoreReturnItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_fromStoreId_fkey" FOREIGN KEY ("fromStoreId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_toStoreId_fkey" FOREIGN KEY ("toStoreId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequestItem" ADD CONSTRAINT "TransferRequestItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "TransferRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequestItem" ADD CONSTRAINT "TransferRequestItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisposalItem" ADD CONSTRAINT "DisposalItem_disposalId_fkey" FOREIGN KEY ("disposalId") REFERENCES "DisposalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisposalItem" ADD CONSTRAINT "DisposalItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GRN"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCard" ADD CONSTRAINT "UserCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCard" ADD CONSTRAINT "StockCard_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCard" ADD CONSTRAINT "StockCard_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BinCard" ADD CONSTRAINT "BinCard_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BinCard" ADD CONSTRAINT "BinCard_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTake" ADD CONSTRAINT "StockTake_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTake" ADD CONSTRAINT "StockTake_conductedById_fkey" FOREIGN KEY ("conductedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTakeItem" ADD CONSTRAINT "StockTakeItem_stockTakeId_fkey" FOREIGN KEY ("stockTakeId") REFERENCES "StockTake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTakeItem" ADD CONSTRAINT "StockTakeItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatePass" ADD CONSTRAINT "GatePass_sivId_fkey" FOREIGN KEY ("sivId") REFERENCES "StoreIssueVoucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatePass" ADD CONSTRAINT "GatePass_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatePass" ADD CONSTRAINT "GatePass_securityOfficerId_fkey" FOREIGN KEY ("securityOfficerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
