import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/config/db";
import { clearDatabase } from "./utils/db";

let storekeeperToken: string;
let approverToken: string;
let storeId: string;
let binId: string;
let itemId: string;
let storekeeperId: string;

async function seedRole(name: string, permissions: string[]) {
  // Use upsert so the test is idempotent if a prior run left stale data
  const existing = await prisma.role.findUnique({ where: { name } });
  if (existing) {
    await prisma.rolePermission.deleteMany({ where: { roleId: existing.id } });
    await prisma.role.delete({ where: { id: existing.id } });
  }
  const role = await prisma.role.create({
    data: {
      name,
      permissions: {
        create: permissions.map((p) => ({
          permission: {
            connectOrCreate: {
              where: { name: p },
              create: { name: p, module: p.split(".")[0] },
            },
          },
        })),
      },
    },
  });
  return role;
}

async function seedUser(email: string, roleId: string) {
  const user = await prisma.user.create({
    data: {
      email,
      username: email.split("@")[0],
      fullName: email,
      passwordHash: "hash",
      status: "ACTIVE",
    },
  });
  await prisma.userRole.create({ data: { userId: user.id, roleId } });
  const token = `token-${email}`;
  await prisma.userSession.create({
    data: {
      userId: user.id,
      token,
      refresh: `refresh-${email}`,
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  return { user, token };
}

beforeAll(async () => {
  await clearDatabase();

  const keeperRole = await seedRole("ST_KEEPER", [
    "stocktakes.create", "stocktakes.read", "stocktakes.update", "stocktakes.submit",
  ]);
  const approverRole = await seedRole("ST_APPROVER", [
    "stocktakes.read", "stocktakes.review", "stocktakes.recount",
    "stockadjustments.read", "stockadjustments.approve", "stockadjustments.post",
  ]);

  const keeper = await seedUser("keeper@test.com", keeperRole.id);
  const approver = await seedUser("approver@test.com", approverRole.id);
  storekeeperToken = keeper.token;
  approverToken = approver.token;
  storekeeperId = keeper.user.id;

  const store = await prisma.store.create({ data: { code: "ST-STORE", name: "Count Store" } });
  storeId = store.id;
  const loc = await prisma.storeLocation.create({ data: { storeId, code: "L1", name: "Loc 1" } });
  const shelf = await prisma.shelf.create({ data: { locationId: loc.id, code: "S1", name: "Shelf 1" } });
  const bin = await prisma.bin.create({ data: { shelfId: shelf.id, code: "B1", name: "Bin 1" } });
  binId = bin.id;

  const cat = await prisma.category.create({ data: { code: "CAT", name: "Cat" } });
  const uom = await prisma.unitOfMeasure.create({ data: { code: "EA", name: "Each" } });
  const item = await prisma.inventoryItem.create({
    data: { code: "COUNT-ITEM", name: "Count Item", categoryId: cat.id, uomId: uom.id },
  });
  itemId = item.id;

  await prisma.binStock.create({ data: { itemId, binId, quantity: 100, reservedQty: 0 } });
  await prisma.storeStock.create({ data: { itemId, storeId, quantity: 100, reservedQty: 0 } });
  await prisma.fifoLayer.create({
    data: { storeId, itemId, originalQty: 100, remainingQty: 100, unitCost: 10, batchNumber: "OPEN" },
  });
});

afterAll(async () => {
  await clearDatabase();
});

describe("Stock Takes & Adjustments", () => {
  let stockTakeId: string;
  let adjustmentId: string;

  it("creating and starting a stock take does not mutate stock", async () => {
    const beforeBin = await prisma.binStock.findUnique({ where: { itemId_binId: { itemId, binId } } });
    const beforeStore = await prisma.storeStock.findUnique({ where: { itemId_storeId: { itemId, storeId } } });

    const createRes = await request(app)
      .post("/api/v1/stock-takes")
      .set("Authorization", `Bearer ${storekeeperToken}`)
      .send({ storeId, notes: "Cycle count" });
    expect(createRes.status).toBe(201);
    stockTakeId = createRes.body.data.id;
    expect(createRes.body.data.status).toBe("DRAFT");

    await request(app)
      .post(`/api/v1/stock-takes/${stockTakeId}/items`)
      .set("Authorization", `Bearer ${storekeeperToken}`)
      .send({ items: [{ itemId, binId }] });

    const startRes = await request(app)
      .post(`/api/v1/stock-takes/${stockTakeId}/start`)
      .set("Authorization", `Bearer ${storekeeperToken}`);
    expect(startRes.status).toBe(200);
    expect(startRes.body.data.status).toBe("IN_PROGRESS");
    expect(startRes.body.data.items[0].systemQty).toBe(100);

    const afterBin = await prisma.binStock.findUnique({ where: { itemId_binId: { itemId, binId } } });
    const afterStore = await prisma.storeStock.findUnique({ where: { itemId_storeId: { itemId, storeId } } });
    expect(afterBin?.quantity).toBe(beforeBin?.quantity);
    expect(afterStore?.quantity).toBe(beforeStore?.quantity);
  });

  it("records count and submits without mutating stock", async () => {
    const countRes = await request(app)
      .patch(`/api/v1/stock-takes/${stockTakeId}/count`)
      .set("Authorization", `Bearer ${storekeeperToken}`)
      .send({ items: [{ itemId, binId, physicalQty: 95, remarks: "Short 5" }] });
    expect(countRes.status).toBe(200);
    expect(countRes.body.data.items[0].variance).toBe(-5);

    const submitRes = await request(app)
      .post(`/api/v1/stock-takes/${stockTakeId}/submit`)
      .set("Authorization", `Bearer ${storekeeperToken}`);
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe("SUBMITTED");

    const storeStock = await prisma.storeStock.findUnique({ where: { itemId_storeId: { itemId, storeId } } });
    expect(storeStock?.quantity).toBe(100);
  });

  it("blocks count edits after submit", async () => {
    const res = await request(app)
      .patch(`/api/v1/stock-takes/${stockTakeId}/count`)
      .set("Authorization", `Bearer ${storekeeperToken}`)
      .send({ items: [{ itemId, binId, physicalQty: 90 }] });
    expect(res.status).toBe(409);
  });

  it("approves stock take and creates adjustment draft", async () => {
    const approveRes = await request(app)
      .post(`/api/v1/stock-takes/${stockTakeId}/approve`)
      .set("Authorization", `Bearer ${approverToken}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe("APPROVED");
    expect(approveRes.body.data.adjustment).toBeTruthy();
    adjustmentId = approveRes.body.data.adjustment.id;
  });

  it("simulates stock movement during count and posts delta against current stock", async () => {
    await prisma.storeStock.update({
      where: { itemId_storeId: { itemId, storeId } },
      data: { quantity: { increment: 20 } },
    });
    await prisma.binStock.update({
      where: { itemId_binId: { itemId, binId } },
      data: { quantity: { increment: 20 } },
    });

    const approveAdj = await request(app)
      .post(`/api/v1/stock-adjustments/${adjustmentId}/approve`)
      .set("Authorization", `Bearer ${approverToken}`)
      .send({});
    expect(approveAdj.status).toBe(200);

    const postRes = await request(app)
      .post(`/api/v1/stock-adjustments/${adjustmentId}/post`)
      .set("Authorization", `Bearer ${approverToken}`);
    expect(postRes.status).toBe(200);
    expect(postRes.body.data.status).toBe("POSTED");

    const storeStock = await prisma.storeStock.findUnique({ where: { itemId_storeId: { itemId, storeId } } });
    const binStock = await prisma.binStock.findUnique({ where: { itemId_binId: { itemId, binId } } });
    expect(storeStock?.quantity).toBe(115);
    expect(binStock?.quantity).toBe(115);

    const txn = await prisma.stockTransaction.findFirst({
      where: { referenceId: adjustmentId, type: "ADJUSTMENT_OUT" },
    });
    expect(txn).toBeTruthy();
    expect(txn?.quantity).toBe(-5);

    const duplicatePost = await request(app)
      .post(`/api/v1/stock-adjustments/${adjustmentId}/post`)
      .set("Authorization", `Bearer ${approverToken}`);
    expect(duplicatePost.status).toBe(409);
  });

  it("handles positive variance with fifo-derived cost", async () => {
    const createRes = await request(app)
      .post("/api/v1/stock-takes")
      .set("Authorization", `Bearer ${storekeeperToken}`)
      .send({ storeId, notes: "Overage count" });
    const stId = createRes.body.data.id;

    await request(app)
      .post(`/api/v1/stock-takes/${stId}/items`)
      .set("Authorization", `Bearer ${storekeeperToken}`)
      .send({ items: [{ itemId, binId }] });
    await request(app)
      .post(`/api/v1/stock-takes/${stId}/start`)
      .set("Authorization", `Bearer ${storekeeperToken}`);
    await request(app)
      .patch(`/api/v1/stock-takes/${stId}/count`)
      .set("Authorization", `Bearer ${storekeeperToken}`)
      .send({ items: [{ itemId, binId, physicalQty: 120 }] });
    await request(app)
      .post(`/api/v1/stock-takes/${stId}/submit`)
      .set("Authorization", `Bearer ${storekeeperToken}`);
    await request(app)
      .post(`/api/v1/stock-takes/${stId}/approve`)
      .set("Authorization", `Bearer ${approverToken}`);

    const st = await prisma.stockTake.findUnique({ where: { id: stId }, include: { adjustment: true } });
    const adjId = st!.adjustment!.id;

    await request(app)
      .post(`/api/v1/stock-adjustments/${adjId}/approve`)
      .set("Authorization", `Bearer ${approverToken}`)
      .send({});
    const postRes = await request(app)
      .post(`/api/v1/stock-adjustments/${adjId}/post`)
      .set("Authorization", `Bearer ${approverToken}`);
    expect(postRes.status).toBe(200);

    const adjItem = await prisma.stockAdjustmentItem.findFirst({ where: { stockAdjustmentId: adjId } });
    expect(adjItem?.unitCost).toBe(10);

    const fifo = await prisma.fifoLayer.findFirst({
      where: { storeId, itemId, batchNumber: postRes.body.data.code },
    });
    expect(fifo?.remainingQty).toBe(5);
  });
});
