import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/config/db";
import { generateToken } from "../src/utils/crypto";
import { clearDatabase } from "./utils/db";

let token: string;
let storeId: string;
let binId: string;
let itemId: string;

beforeAll(async () => {
  await clearDatabase();

  const user = await prisma.user.create({
    data: {
      email: "returns@test.com",
      username: "returnstest",
      fullName: "Returns Test",
      passwordHash: "hash",
      status: "ACTIVE",
    },
  });
  const role = await prisma.role.create({
    data: {
      name: "RETURNS_ROLE",
      permissions: {
        create: [
          { permission: { create: { name: "returns.create", module: "returns" } } },
          { permission: { create: { name: "returns.read", module: "returns" } } },
          { permission: { create: { name: "returns.evaluate", module: "returns" } } },
          { permission: { create: { name: "returns.approve", module: "returns" } } },
          { permission: { create: { name: "returns.receive", module: "returns" } } },
        ],
      },
    },
  });
  await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  
  token = "test-token-returns-123";
  await prisma.userSession.create({
    data: {
      userId: user.id,
      token,
      refresh: "test-refresh-returns-123",
      expiresAt: new Date(Date.now() + 3600000),
    }
  });

  const store = await prisma.store.create({
    data: { code: "RET-STORE", name: "Returns Store" },
  });
  storeId = store.id;

  const loc = await prisma.storeLocation.create({
    data: { storeId: store.id, code: "L1", name: "Loc 1" },
  });
  const shelf = await prisma.shelf.create({
    data: { locationId: loc.id, code: "S1", name: "Shelf 1" },
  });
  const bin = await prisma.bin.create({
    data: { shelfId: shelf.id, code: "B1", name: "Bin 1" },
  });
  binId = bin.id;

  const cat = await prisma.category.create({ data: { code: "CAT", name: "Cat" } });
  const uom = await prisma.unitOfMeasure.create({ data: { code: "UOM", name: "Uom" } });
  const item = await prisma.inventoryItem.create({
    data: { code: "RET-ITEM", name: "Return Item", categoryId: cat.id, uomId: uom.id },
  });
  itemId = item.id;
});

afterAll(async () => {
  await clearDatabase();
});

describe("Returns API", () => {
  let srnId: string;

  it("should create a store return note", async () => {
    const res = await request(app)
      .post("/api/v1/returns")
      .set("Authorization", `Bearer ${token}`)
      .send({
        storeId,
        department: "IT",
        items: [{ itemId, quantity: 10, reason: "Excess" }],
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    srnId = res.body.data.id;
  });

  it("should submit the return note", async () => {
    const res = await request(app)
      .post(`/api/v1/returns/${srnId}/submit`)
      .set("Authorization", `Bearer ${token}`)
      .send();
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("SUBMITTED");
  });

  it("should evaluate and partially accept the return", async () => {
    const res = await request(app)
      .post(`/api/v1/returns/${srnId}/evaluate`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ itemId, acceptedQty: 8 }],
        notes: "2 rejected due to damage",
      });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("UNDER_EVALUATION");
  });

  it("should reject receiving if not APPROVED", async () => {
    const res = await request(app)
      .post(`/api/v1/returns/${srnId}/receive`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ itemId, allocations: [{ binId, quantity: 8 }] }],
      });
    expect(res.status).toBe(409); // conflict
  });

  it("should approve the return", async () => {
    const res = await request(app)
      .post(`/api/v1/returns/${srnId}/approve`)
      .set("Authorization", `Bearer ${token}`)
      .send();
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("APPROVED");
  });

  it("should fail to receive if valuation is missing (no originalSivId)", async () => {
    const res = await request(app)
      .post(`/api/v1/returns/${srnId}/receive`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ itemId, allocations: [{ binId, quantity: 8 }] }],
      });
    expect(res.status).toBe(422);
    expect(res.body.message).toContain("Cannot reliably determine original issue cost");
  });

  it("should receive the return after setting originalSivId", async () => {
    // Manually create a SIV and attach it to test valuation
    const siv = await prisma.storeIssueVoucher.create({
      data: {
        code: "SIV-TEST",
        store: { connect: { id: storeId } },
        status: "ISSUED",
        createdBy: { connect: { id: (await prisma.user.findFirst())!.id } },
        items: {
          create: [{ itemId, quantity: 10, issuedQty: 10, unitCost: 15.5 }],
        },
      },
    });
    await prisma.storeReturnNote.update({
      where: { id: srnId },
      data: { originalSivId: siv.id, status: "APPROVED" }, // Ensure it's still APPROVED
    });

    const res = await request(app)
      .post(`/api/v1/returns/${srnId}/receive`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ itemId, allocations: [{ binId, quantity: 8 }] }],
      });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("RECEIVED");

    // Check BinStock
    const binStock = await prisma.binStock.findUnique({
      where: { itemId_binId: { itemId, binId } },
    });
    expect(binStock?.quantity).toBe(8);

    // Check StoreStock
    const storeStock = await prisma.storeStock.findUnique({
      where: { itemId_storeId: { itemId, storeId } },
    });
    expect(storeStock?.quantity).toBe(8);

    // Check FIFO Layer
    const fifo = await prisma.fifoLayer.findFirst({
      where: { storeId, itemId },
    });
    expect(fifo?.unitCost).toBe(15.5);
    expect(fifo?.originalQty).toBe(8);
  });
});
