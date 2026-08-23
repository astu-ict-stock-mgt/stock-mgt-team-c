-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('SIV', 'ISIV');

-- AlterTable
ALTER TABLE "Requisition" ADD COLUMN     "destinationDepartment" TEXT;

-- AlterTable
ALTER TABLE "StoreIssueVoucher" ADD COLUMN     "destinationStoreId" TEXT,
ADD COLUMN     "voucherType" "VoucherType" NOT NULL DEFAULT 'SIV';

-- CreateTable
CREATE TABLE "SIVBinAllocation" (
    "id" TEXT NOT NULL,
    "sivItemId" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SIVBinAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SIVBinAllocation_sivItemId_idx" ON "SIVBinAllocation"("sivItemId");

-- CreateIndex
CREATE INDEX "SIVBinAllocation_binId_idx" ON "SIVBinAllocation"("binId");

-- AddForeignKey
ALTER TABLE "StoreIssueVoucher" ADD CONSTRAINT "StoreIssueVoucher_destinationStoreId_fkey" FOREIGN KEY ("destinationStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SIVBinAllocation" ADD CONSTRAINT "SIVBinAllocation_sivItemId_fkey" FOREIGN KEY ("sivItemId") REFERENCES "SIVItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SIVBinAllocation" ADD CONSTRAINT "SIVBinAllocation_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
