import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/config/db";
import { vi } from "vitest";

// Mock auth
vi.mock("../src/middleware/auth", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    requirePermission: () => (req: any, res: any, next: any) => {
      req.userId = "test-user-id";
      next();
    },
    attachAuth: (req: any, res: any, next: any) => {
      req.userId = "test-user-id";
      next();
    },
    asyncHandler: actual.asyncHandler
  };
});

describe("Phase 3: Goods Receiving & GRN Workflow", () => {
  let supplierId: string;
  let storeId: string;
  let locId: string;
  let shelfId: string;
  let binId: string;
  let itemId: string;
  let receiptId: string;
  let grnId: string;

  beforeAll(async () => {
    // Cleanup
    await (prisma as any).fifoLayer.deleteMany();
    await (prisma as any).binCard.deleteMany();
    await (prisma as any).stockCard.deleteMany();
    await (prisma as any).stockTransaction.deleteMany();
    await (prisma as any).gRN.deleteMany();
    await (prisma as any).technicalEvaluationItem.deleteMany();
    await (prisma as any).technicalEvaluation.deleteMany();
    await (prisma as any).goodsReceiptItem.deleteMany();
    await (prisma as any).goodsReceipt.deleteMany();
    await (prisma as any).binStock.deleteMany();
    await (prisma as any).storeStock.deleteMany();
    await (prisma as any).bin.deleteMany();
    await (prisma as any).shelf.deleteMany();
    await (prisma as any).storeLocation.deleteMany();
    await (prisma as any).store.deleteMany();
    await (prisma as any).inventoryItem.deleteMany();
    await (prisma as any).unitOfMeasure.deleteMany();
    await (prisma as any).category.deleteMany();
    await (prisma as any).supplier.deleteMany();

    // Create prerequisites
    const supplier = await prisma.supplier.create({
      data: { code: "SUP-01", name: "Test Supplier" }
    });
    supplierId = supplier.id;

    const store = await prisma.store.create({
      data: { code: "STR-01", name: "Main Store" }
    });
    storeId = store.id;

    const loc = await prisma.storeLocation.create({
      data: { code: "LOC-01", name: "Loc 1", storeId: store.id }
    });
    locId = loc.id;

    const shelf = await prisma.shelf.create({
      data: { code: "SH-01", name: "Shelf 1", locationId: loc.id }
    });
    shelfId = shelf.id;

    const bin = await prisma.bin.create({
      data: { code: "BIN-01", name: "Bin 1", shelfId: shelf.id }
    });
    binId = bin.id;

    // Create Category and UOM first
    const uom = await prisma.unitOfMeasure.create({ data: { code: "PCS", name: "Pieces" } });
    const category = await prisma.category.create({ data: { code: "CAT", name: "Category" } });

    const item = await prisma.inventoryItem.create({
      data: {
        code: "ITEM-01",
        name: "Test Item",
        categoryId: category.id,
        uomId: uom.id,
      }
    });
    itemId = item.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("1. Create Goods Receipt", async () => {
    const res = await request(app).post("/api/v1/goods-receipts").send({
      supplierId,
      storeId,
      deliveryNote: "DN-123",
      items: [
        {
          itemId,
          quantity: 100,
          unitCost: 50,
          condition: "Good",
          binId: binId
        }
      ]
    });
    console.log("RESPONSE:", res.status, res.body);
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("DRAFT");
    receiptId = res.body.data.id;

    // Verify stock has NOT changed
    const storeStock = await prisma.storeStock.findUnique({
      where: { itemId_storeId: { itemId, storeId } }
    });
    expect(storeStock).toBeNull(); // No stock yet
  });

  it("2. Submit Goods Receipt", async () => {
    const res = await request(app).post(`/api/v1/goods-receipts/${receiptId}/submit`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("SUBMITTED");
  });

  it("3. Technical Evaluation (Partial Acceptance)", async () => {
    const receipt = await prisma.goodsReceipt.findUnique({ where: { id: receiptId }, include: { items: true } });
    const receiptItemId = receipt!.items[0].id;

    const res = await request(app).post(`/api/v1/goods-receipts/${receiptId}/evaluation`).send({
      decision: "APPROVED_WITH_CONDITIONS",
      comments: "10 damaged, returning later",
      items: [
        {
          goodsReceiptItemId: receiptItemId,
          acceptedQuantity: 90,
          rejectedQuantity: 10,
          condition: "Some damaged",
          decision: "APPROVED_WITH_CONDITIONS"
        }
      ]
    });
    expect(res.status).toBe(201);
    
    // Verify receipt status changed
    const updated = await prisma.goodsReceipt.findUnique({ where: { id: receiptId } });
    expect(updated?.status).toBe("ACCEPTED"); // As defined in evaluation.ts, non-rejected -> ACCEPTED

    // Verify stock still hasn't changed
    const storeStock = await prisma.storeStock.findUnique({
      where: { itemId_storeId: { itemId, storeId } }
    });
    expect(storeStock).toBeNull();
  });

  it("4. Generate GRN & Verify Atomic Stock Mutation", async () => {
    const res = await request(app).post(`/api/v1/goods-receipts/${receiptId}/grn`).send({
      notes: "Received partially"
    });
    expect(res.status).toBe(201);
    expect(res.body.data.code).toMatch(/^GRN-/);
    grnId = res.body.data.id;

    // Verify StoreStock increased by exactly accepted quantity (90)
    const storeStock = await prisma.storeStock.findUnique({
      where: { itemId_storeId: { itemId, storeId } }
    });
    expect(storeStock?.quantity).toBe(90);

    // Verify BinStock increased by 90
    const binStock = await prisma.binStock.findUnique({
      where: { itemId_binId: { itemId, binId } }
    });
    expect(binStock?.quantity).toBe(90);

    // Verify StockTransaction created
    const tx = await prisma.stockTransaction.findFirst({
      where: { referenceId: grnId }
    });
    expect(tx).toBeTruthy();
    expect(tx?.quantity).toBe(90);
    expect(tx?.balanceAfter).toBe(90);
    expect(tx?.type).toBe("RECEIPT");
  });

  it("5. Duplicate GRN generation is rejected", async () => {
    const res = await request(app).post(`/api/v1/goods-receipts/${receiptId}/grn`).send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/ALREADY_GENERATED/);
  });
});
