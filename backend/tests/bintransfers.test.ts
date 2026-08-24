import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/config/db";
import { clearDatabase } from "./utils/db";

let token: string;
let storeId: string;
let fromBinId: string;
let toBinId: string;
let otherStoreBinId: string;
let itemId: string;

beforeAll(async () => {
  await clearDatabase();

  const user = await prisma.user.create({
    data: {
      email: "bintransfers@test.com",
      username: "bintransfers",
      fullName: "Bin Transfers Test",
      passwordHash: "hash",
      status: "ACTIVE",
    },
  });
  const role = await prisma.role.create({
    data: {
      name: "BTR_ROLE",
      permissions: {
        create: [
          { permission: { create: { name: "bintransfers.execute", module: "bintransfers" } } },
        ],
      },
    },
  });
  await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });

  token = "test-token-btr-123";
  await prisma.userSession.create({
    data: {
      userId: user.id,
      token,
      refresh: "test-refresh-btr-123",
      expiresAt: new Date(Date.now() + 3600000),
    }
  });

  const store = await prisma.store.create({ data: { code: "BTR-STORE", name: "BTR Store" } });
  storeId = store.id;
  const store2 = await prisma.store.create({ data: { code: "BTR-STORE2", name: "BTR Store 2" } });

  const loc1 = await prisma.storeLocation.create({ data: { storeId: store.id, code: "L1", name: "Loc 1" } });
  const loc2 = await prisma.storeLocation.create({ data: { storeId: store2.id, code: "L2", name: "Loc 2" } });

  const shelf1 = await prisma.shelf.create({ data: { locationId: loc1.id, code: "S1", name: "Shelf 1" } });
  const shelf2 = await prisma.shelf.create({ data: { locationId: loc2.id, code: "S2", name: "Shelf 2" } });

  const bin1 = await prisma.bin.create({ data: { shelfId: shelf1.id, code: "B1", name: "Bin 1" } });
  fromBinId = bin1.id;
  const bin2 = await prisma.bin.create({ data: { shelfId: shelf1.id, code: "B2", name: "Bin 2" } });
  toBinId = bin2.id;
  
  const bin3 = await prisma.bin.create({ data: { shelfId: shelf2.id, code: "B3", name: "Bin 3" } });
  otherStoreBinId = bin3.id;

  const cat = await prisma.category.create({ data: { code: "CAT", name: "Cat" } });
  const uom = await prisma.unitOfMeasure.create({ data: { code: "UOM", name: "Uom" } });
  const item = await prisma.inventoryItem.create({
    data: { code: "BTR-ITEM", name: "BTR Item", categoryId: cat.id, uomId: uom.id },
  });
  itemId = item.id;

  // Add stock
  await prisma.binStock.create({
    data: { itemId, binId: fromBinId, quantity: 50, reservedQty: 0 },
  });
  await prisma.storeStock.create({
    data: { itemId, storeId, quantity: 50, reservedQty: 0 },
  });
});

afterAll(async () => {
  await clearDatabase();
});

describe("Bin Transfers API", () => {
  it("should fail to transfer if source and destination are different stores", async () => {
    const res = await request(app)
      .post("/api/v1/bin-transfers")
      .set("Authorization", `Bearer ${token}`)
      .send({ itemId, fromBinId, toBinId: otherStoreBinId, quantity: 10 });
    expect(res.status).toBe(422);
    expect(res.body.message).toContain("must occur within the same store");
  });

  it("should fail to transfer if insufficient stock", async () => {
    const res = await request(app)
      .post("/api/v1/bin-transfers")
      .set("Authorization", `Bearer ${token}`)
      .send({ itemId, fromBinId, toBinId, quantity: 100 });
    expect(res.status).toBe(422);
    expect(res.body.message).toContain("Insufficient available stock");
  });

  it("should successfully execute an internal bin transfer", async () => {
    const res = await request(app)
      .post("/api/v1/bin-transfers")
      .set("Authorization", `Bearer ${token}`)
      .send({ itemId, fromBinId, toBinId, quantity: 15 });
    
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("EXECUTED");

    // Check BinStock
    const fromStock = await prisma.binStock.findUnique({ where: { itemId_binId: { itemId, binId: fromBinId } } });
    const toStock = await prisma.binStock.findUnique({ where: { itemId_binId: { itemId, binId: toBinId } } });
    
    expect(fromStock?.quantity).toBe(35); // 50 - 15
    expect(toStock?.quantity).toBe(15);   // 0 + 15

    // Check StoreStock remains unchanged
    const storeStock = await prisma.storeStock.findUnique({ where: { itemId_storeId: { itemId, storeId } } });
    expect(storeStock?.quantity).toBe(50); // Untouched
  });
});
