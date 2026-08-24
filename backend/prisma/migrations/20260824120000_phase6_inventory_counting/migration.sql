-- Phase 6: Physical Inventory Counting & Stock Adjustments

-- Extend StockTakeStatus workflow states
ALTER TYPE "StockTakeStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';
ALTER TYPE "StockTakeStatus" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE "StockTakeStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "StockTakeStatus" ADD VALUE IF NOT EXISTS 'RECOUNT_REQUIRED';
ALTER TYPE "StockTakeStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

-- Clear legacy stock take rows that lack bin-level granularity
DELETE FROM "StockTakeItem";
DELETE FROM "StockTake";

-- StockTakeItem: bin-level counting + nullable baseline until start
ALTER TABLE "StockTakeItem" ADD COLUMN IF NOT EXISTS "binId" TEXT;
ALTER TABLE "StockTakeItem" ADD COLUMN IF NOT EXISTS "unitCostOverride" DOUBLE PRECISION;
ALTER TABLE "StockTakeItem" ALTER COLUMN "systemQty" DROP NOT NULL;

ALTER TABLE "StockTakeItem" ALTER COLUMN "binId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "StockTakeItem_stockTakeId_itemId_binId_key"
  ON "StockTakeItem"("stockTakeId", "itemId", "binId");
CREATE INDEX IF NOT EXISTS "StockTakeItem_binId_idx" ON "StockTakeItem"("binId");

ALTER TABLE "StockTakeItem"
  ADD CONSTRAINT "StockTakeItem_binId_fkey"
  FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- StockAdjustment workflow
CREATE TYPE "StockAdjustmentStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'POSTED');

CREATE TABLE "StockAdjustment" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "stockTakeId" TEXT,
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "status" "StockAdjustmentStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StockAdjustmentItem" (
    "id" TEXT NOT NULL,
    "stockAdjustmentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "variance" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION,
    "remarks" TEXT,

    CONSTRAINT "StockAdjustmentItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StockAdjustment_code_key" ON "StockAdjustment"("code");
CREATE UNIQUE INDEX "StockAdjustment_stockTakeId_key" ON "StockAdjustment"("stockTakeId");
CREATE INDEX "StockAdjustment_status_idx" ON "StockAdjustment"("status");
CREATE INDEX "StockAdjustment_storeId_idx" ON "StockAdjustment"("storeId");
CREATE UNIQUE INDEX "StockAdjustmentItem_stockAdjustmentId_itemId_binId_key"
  ON "StockAdjustmentItem"("stockAdjustmentId", "itemId", "binId");
CREATE INDEX "StockAdjustmentItem_stockAdjustmentId_idx" ON "StockAdjustmentItem"("stockAdjustmentId");

ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_stockTakeId_fkey"
  FOREIGN KEY ("stockTakeId") REFERENCES "StockTake"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StockAdjustmentItem" ADD CONSTRAINT "StockAdjustmentItem_stockAdjustmentId_fkey"
  FOREIGN KEY ("stockAdjustmentId") REFERENCES "StockAdjustment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockAdjustmentItem" ADD CONSTRAINT "StockAdjustmentItem_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockAdjustmentItem" ADD CONSTRAINT "StockAdjustmentItem_binId_fkey"
  FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
