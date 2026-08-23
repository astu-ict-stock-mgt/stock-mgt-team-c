-- AlterTable
ALTER TABLE "GoodsReceiptItem" ADD COLUMN     "binId" TEXT,
ADD COLUMN     "condition" TEXT;

-- CreateTable
CREATE TABLE "TechnicalEvaluationItem" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "goodsReceiptItemId" TEXT NOT NULL,
    "acceptedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rejectedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "condition" TEXT,
    "decision" "EvaluationDecision" NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "TechnicalEvaluationItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TechnicalEvaluationItem_goodsReceiptItemId_key" ON "TechnicalEvaluationItem"("goodsReceiptItemId");

-- CreateIndex
CREATE INDEX "TechnicalEvaluationItem_evaluationId_idx" ON "TechnicalEvaluationItem"("evaluationId");

-- CreateIndex
CREATE INDEX "GoodsReceiptItem_binId_idx" ON "GoodsReceiptItem"("binId");

-- AddForeignKey
ALTER TABLE "GoodsReceiptItem" ADD CONSTRAINT "GoodsReceiptItem_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalEvaluationItem" ADD CONSTRAINT "TechnicalEvaluationItem_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "TechnicalEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalEvaluationItem" ADD CONSTRAINT "TechnicalEvaluationItem_goodsReceiptItemId_fkey" FOREIGN KEY ("goodsReceiptItemId") REFERENCES "GoodsReceiptItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
