import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/config/db";
import { SIVStatus, RequisitionStatus, TransactionType, VoucherType } from "@prisma/client";
import { generateTestToken } from "./utils/auth"; // Assume test utility exists, or we use seed token

let reqId: string;
let sivId: string;
let storeId: string;
let binId: string;
let itemId: string;
let adminToken: string;

describe("Phase 4: Requisitions & SIV Workflow", () => {
  
  beforeAll(async () => {
    // Cleanup
    await (prisma as any).fifoLayer.deleteMany();
    await (prisma as any).binCard.deleteMany();
    await (prisma as any).stockCard.deleteMany();
    await (prisma as any).stockTransaction.deleteMany();
    await (prisma as any).sIVBinAllocation.deleteMany();
    await (prisma as any).sIVItem.deleteMany();
    await (prisma as any).storeIssueVoucher.deleteMany();
    await (prisma as any).requisitionApproval.deleteMany();
    await (prisma as any).requisitionItem.deleteMany();
    await (prisma as any).requisition.deleteMany();
    await (prisma as any).binStock.deleteMany();
    await (prisma as any).storeStock.deleteMany();
    
    // Create Admin Role and User
    const adminRole = await prisma.role.upsert({
      where: { name: "ADMINISTRATOR" },
      update: {},
      create: { name: "ADMINISTRATOR", description: "Admin" }
    });
    const user = await prisma.user.upsert({
      where: { email: "admin_siv@test.com" },
      update: {},
      create: {
        username: "testadmin_siv",
        email: "admin_siv@test.com",
        passwordHash: "dummyhash",
        fullName: "Test Admin",
        status: "ACTIVE",
        userRoles: { create: { roleId: adminRole.id } }
      }
    });

    adminToken = "test-token-siv-123";
    await prisma.userSession.create({
      data: {
        userId: user.id,
        token: adminToken,
        refresh: "test-refresh-siv-123",
        expiresAt: new Date(Date.now() + 3600000), // 1 hr
        ip: "127.0.0.1",
        userAgent: "vitest"
      }
    });

    // Create Store, Location, Shelf, Bin, Item
    const store = await prisma.store.create({ data: { code: "SIV-STR", name: "SIV Store" } });
    storeId = store.id;

    const loc = await prisma.storeLocation.create({ data: { code: "SIV-LOC", name: "SIV Loc", storeId } });
    const shelf = await prisma.shelf.create({ data: { code: "SIV-SH", name: "SIV Shelf", locationId: loc.id } });
    const bin = await prisma.bin.create({ data: { code: "SIV-BIN", name: "SIV Bin", shelfId: shelf.id } });
    binId = bin.id;

    const uom = await prisma.unitOfMeasure.create({ data: { code: "PCS_SIV", name: "Pieces SIV" } });
    const category = await prisma.category.create({ data: { code: "CAT_SIV", name: "Category SIV" } });
    const item = await prisma.inventoryItem.create({
      data: { code: "ITEM-SIV", name: "Test SIV Item", uomId: uom.id, categoryId: category.id }
    });
    itemId = item.id;

    // Ensure physical stock exists for test
    await prisma.storeStock.upsert({
      where: { itemId_storeId: { itemId, storeId } },
      create: { itemId, storeId, quantity: 500, reservedQty: 0 },
      update: { quantity: 500, reservedQty: 0 }
    });

    await prisma.binStock.upsert({
      where: { itemId_binId: { itemId, binId } },
      create: { itemId, binId, quantity: 500, reservedQty: 0 },
      update: { quantity: 500, reservedQty: 0 }
    });

    // Create a FifoLayer for consumption
    await prisma.fifoLayer.create({
      data: {
        itemId, storeId, originalQty: 500, remainingQty: 500, unitCost: 10
      }
    });
  });

  // TEST 1
  it("Requisition creation -> NO stock mutation", async () => {
    const res = await request(app)
      .post("/api/v1/requisitions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        department: "IT",
        requiredDate: new Date().toISOString(),
        items: [{ itemId, quantity: 100 }]
      });
    
    expect(res.status).toBe(201);
    reqId = res.body.data.id;
    expect(res.body.data.status).toBe(RequisitionStatus.DRAFT);

    const binStock = await prisma.binStock.findUnique({ where: { itemId_binId: { itemId, binId } }});
    expect(binStock!.reservedQty).toBe(0);
    expect(binStock!.quantity).toBe(500);
  });

  // TEST 2
  it("Requisition submission and approval -> NO stock mutation", async () => {
    await request(app).post(`/api/v1/requisitions/${reqId}/submit`).set("Authorization", `Bearer ${adminToken}`);
    const res = await request(app)
      .post(`/api/v1/requisitions/${reqId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ comments: "Approved" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(RequisitionStatus.APPROVED);

    const storeStock = await prisma.storeStock.findUnique({ where: { itemId_storeId: { itemId, storeId } }});
    expect(storeStock!.reservedQty).toBe(0);
    expect(storeStock!.quantity).toBe(500);
  });

  // TEST 3, 4, 7
  it("SIV preliminary allocation -> reservedQty increases correctly, physical unchanged", async () => {
    const res = await request(app)
      .post("/api/v1/sivs")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        requisitionId: reqId,
        storeId,
        voucherType: "SIV",
        items: [{
          itemId,
          quantity: 100,
          allocations: [{ binId, quantity: 100 }]
        }]
      });
    
    expect(res.status).toBe(201);
    sivId = res.body.data.id;
    expect(res.body.data.status).toBe(SIVStatus.PRELIMINARY);

    const binStock = await prisma.binStock.findUnique({ where: { itemId_binId: { itemId, binId } }});
    expect(binStock!.reservedQty).toBe(100);
    expect(binStock!.quantity).toBe(500); // physical unchanged

    const storeStock = await prisma.storeStock.findUnique({ where: { itemId_storeId: { itemId, storeId } }});
    expect(storeStock!.reservedQty).toBe(100);
    expect(storeStock!.quantity).toBe(500); // physical unchanged
  });

  // TEST 5
  it("Reservation cannot exceed available stock", async () => {
    const res = await request(app)
      .post("/api/v1/sivs")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        requisitionId: reqId,
        storeId,
        voucherType: "SIV",
        items: [{
          itemId,
          quantity: 1000,
          allocations: [{ binId, quantity: 1000 }]
        }]
      });
    expect(res.status).toBe(409); // Conflict due to insufficient stock
  });

  // TEST 8
  it("Rejected SIV releases reservations", async () => {
    // create another siv
    const tempRes = await request(app).post("/api/v1/sivs").set("Authorization", `Bearer ${adminToken}`).send({
        requisitionId: reqId, storeId, voucherType: "SIV",
        items: [{ itemId, quantity: 10, allocations: [{ binId, quantity: 10 }] }]
    });
    const tempSivId = tempRes.body.data.id;
    
    const rejectRes = await request(app)
      .post(`/api/v1/sivs/${tempSivId}/reject`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ notes: "Rejected" });
    expect(rejectRes.status).toBe(200);

    const binStock = await prisma.binStock.findUnique({ where: { itemId_binId: { itemId, binId } }});
    expect(binStock!.reservedQty).toBe(100); // Only the first SIV's 100 is reserved
  });

  // TEST 9
  it("Amendment correctly calculates reservation deltas", async () => {
    const res = await request(app)
      .patch(`/api/v1/sivs/${sivId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        items: [{
          itemId,
          quantity: 50,
          allocations: [{ binId, quantity: 50 }]
        }]
      });
    expect(res.status).toBe(200);

    const binStock = await prisma.binStock.findUnique({ where: { itemId_binId: { itemId, binId } }});
    expect(binStock!.reservedQty).toBe(50); // Dropped from 100 to 50
  });

  // TEST 10, 11, 12, 13, 14
  it("Finalization decreases physical stock once, creates ledgers, consumes FIFO", async () => {
    await request(app).post(`/api/v1/sivs/${sivId}/submit`).set("Authorization", `Bearer ${adminToken}`);
    await request(app).post(`/api/v1/sivs/${sivId}/approve`).set("Authorization", `Bearer ${adminToken}`);

    const res = await request(app)
      .post(`/api/v1/sivs/${sivId}/finalize`)
      .set("Authorization", `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(SIVStatus.FINALIZED);

    // Stock check
    const binStock = await prisma.binStock.findUnique({ where: { itemId_binId: { itemId, binId } }});
    expect(binStock!.reservedQty).toBe(0); // released
    expect(binStock!.quantity).toBe(450); // physical decreased

    const storeStock = await prisma.storeStock.findUnique({ where: { itemId_storeId: { itemId, storeId } }});
    expect(storeStock!.reservedQty).toBe(0); // released
    expect(storeStock!.quantity).toBe(450); // physical decreased

    // Ledger check
    const tx = await prisma.stockTransaction.findFirst({ where: { referenceId: sivId }});
    expect(tx).toBeDefined();
    expect(tx!.type).toBe(TransactionType.ISSUE);
    expect(tx!.quantity).toBe(-50); // Outgoing

    const binCard = await prisma.binCard.findFirst({ where: { binId, referenceDoc: res.body.data.code }});
    expect(binCard).toBeDefined();
    expect(binCard!.outQty).toBe(50);

    // Fifo check
    const fifo = await prisma.fifoLayer.findFirst({ where: { itemId, storeId } });
    expect(fifo!.remainingQty).toBe(450); // 50 consumed
  });

  // TEST 15
  it("Duplicate finalization is rejected and does NOT decrease stock again", async () => {
    const res = await request(app)
      .post(`/api/v1/sivs/${sivId}/finalize`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(409); // Conflict, already finalized

    const binStock = await prisma.binStock.findUnique({ where: { itemId_binId: { itemId, binId } }});
    expect(binStock!.quantity).toBe(450); // physical STILL 450
  });

  // TEST 17 & 18
  it("ISIV requires destinationStoreId and standard SIV rejects it", async () => {
    const resIsivFail = await request(app)
      .post("/api/v1/sivs")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        requisitionId: reqId, storeId, voucherType: "ISIV",
        items: [{ itemId, quantity: 1, allocations: [{ binId, quantity: 1 }] }]
      });
    expect(resIsivFail.status).toBe(400); // Zod validation fails, destinationStoreId missing

    const destStore = await prisma.store.create({ data: { code: "DEST1", name: "Dest" } });
    
    const resSivFail = await request(app)
      .post("/api/v1/sivs")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        requisitionId: reqId, storeId, voucherType: "SIV", destinationStoreId: destStore.id,
        items: [{ itemId, quantity: 1, allocations: [{ binId, quantity: 1 }] }]
      });
    expect(resSivFail.status).toBe(400); // Zod validation fails, destinationStoreId must NOT be present
  });
});
