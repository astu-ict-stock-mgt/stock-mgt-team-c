import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/config/db";
import { clearDatabase } from "./utils/db";

let token: string;
let fromStoreId: string;
let toStoreId: string;
let fromBinId: string;
let toBinId: string;
let itemId: string;

beforeAll(async () => {
  await clearDatabase();

  const user = await prisma.user.create({
    data: {
      email: "transfers@test.com",
      username: "transfers",
      fullName: "Transfers Test",
      passwordHash: "hash",
      status: "ACTIVE",
    },
  });
  const role = await prisma.role.create({
    data: {
      name: "TRF_ROLE",
      permissions: {
        create: [
          { permission: { create: { name: "transfers.create", module: "transfers" } } },
          { permission: { create: { name: "transfers.read", module: "transfers" } } },
          { permission: { create: { name: "transfers.approve", module: "transfers" } } },
          { permission: { create: { name: "transfers.dispatch", module: "transfers" } } },
          { permission: { create: { name: "transfers.receive", module: "transfers" } } },
        ],
      },
    },
  });
  await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });

  token = "test-token-trf-123";
  await prisma.userSession.create({
    data: {
      userId: user.id,
      token,
      refresh: "test-refresh-trf-123",
      expiresAt: new Date(Date.now() + 3600000),
    }
  });

  const fromStore = await prisma.store.create({ data: { code: "TRF-FROM", name: "From Store" } });
  fromStoreId = fromStore.id;
  const toStore = await prisma.store.create({ data: { code: "TRF-TO", name: "To Store" } });
  toStoreId = toStore.id;

  const loc1 = await prisma.storeLocation.create({ data: { storeId: fromStore.id, code: "L1", name: "Loc 1" } });
  const shelf1 = await prisma.shelf.create({ data: { locationId: loc1.id, code: "S1", name: "Shelf 1" } });
  const bin1 = await prisma.bin.create({ data: { shelfId: shelf1.id, code: "B1", name: "Bin 1" } });
  fromBinId = bin1.id;

  const loc2 = await prisma.storeLocation.create({ data: { storeId: toStore.id, code: "L2", name: "Loc 2" } });
  const shelf2 = await prisma.shelf.create({ data: { locationId: loc2.id, code: "S2", name: "Shelf 2" } });
  const bin2 = await prisma.bin.create({ data: { shelfId: shelf2.id, code: "B2", name: "Bin 2" } });
  toBinId = bin2.id;

  const cat = await prisma.category.create({ data: { code: "CAT", name: "Cat" } });
  const uom = await prisma.unitOfMeasure.create({ data: { code: "UOM", name: "Uom" } });
  const item = await prisma.inventoryItem.create({
    data: { code: "TRF-ITEM", name: "TRF Item", categoryId: cat.id, uomId: uom.id },
  });
  itemId = item.id;

  // Add stock to source
  await prisma.binStock.create({
    data: { itemId, binId: fromBinId, quantity: 100, reservedQty: 0 },
  });
  await prisma.storeStock.create({
    data: { itemId, storeId: fromStoreId, quantity: 100, reservedQty: 0 },
  });

  // Add FIFO layer for cost calculation
  await prisma.fifoLayer.create({
    data: {
      storeId: fromStoreId,
      itemId,
      originalQty: 100,
      remainingQty: 100,
      unitCost: 10.0,
      batchNumber: "INITIAL"
    }
  });
});

afterAll(async () => {
  await clearDatabase();
});

describe("Inter-Store Transfers API", () => {
  let trfId: string;

  it("should create a transfer request", async () => {
    const res = await request(app)
      .post("/api/v1/transfers")
      .set("Authorization", `Bearer ${token}`)
      .send({
        fromStoreId,
        toStoreId,
        items: [{ itemId, quantity: 50 }],
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    trfId = res.body.data.id;
  });

  it("should submit the transfer request", async () => {
    const res = await request(app)
      .post(`/api/v1/transfers/${trfId}/submit`)
      .set("Authorization", `Bearer ${token}`)
      .send();
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("SUBMITTED");
  });

  it("should approve the transfer request", async () => {
    const res = await request(app)
      .post(`/api/v1/transfers/${trfId}/approve`)
      .set("Authorization", `Bearer ${token}`)
      .send();
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("APPROVED");
  });

  it("should dispatch the transfer request", async () => {
    const res = await request(app)
      .post(`/api/v1/transfers/${trfId}/dispatch`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ itemId, allocations: [{ binId: fromBinId, quantity: 50 }] }],
      });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("DISPATCHED");

    // Check source stock decreased
    const fromStock = await prisma.storeStock.findUnique({ where: { itemId_storeId: { itemId, storeId: fromStoreId } } });
    expect(fromStock?.quantity).toBe(50);
  });

  it("should receive the transfer request with discrepancy tracking", async () => {
    const res = await request(app)
      .post(`/api/v1/transfers/${trfId}/receive`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ itemId, receivedQty: 40, allocations: [{ binId: toBinId, quantity: 40 }] }],
      });
    
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("RECEIVED");
    expect(res.body.data.notes).toContain("DISCREPANCY INVESTIGATION REQUIRED");

    // Check discrepancy saved on item
    const dbItem = res.body.data.items[0];
    expect(dbItem.dispatchedQty).toBe(50);
    expect(dbItem.receivedQty).toBe(40);

    // Check destination stock increased
    const toStock = await prisma.storeStock.findUnique({ where: { itemId_storeId: { itemId, storeId: toStoreId } } });
    expect(toStock?.quantity).toBe(40);

    // Check FIFO layer created at destination
    const fifo = await prisma.fifoLayer.findFirst({ where: { storeId: toStoreId, itemId } });
    expect(fifo?.unitCost).toBe(10.0);
    expect(fifo?.originalQty).toBe(40);
  });
});
