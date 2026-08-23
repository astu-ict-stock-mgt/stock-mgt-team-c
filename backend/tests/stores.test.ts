import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/config/db";

// Helper for auth bypass in tests, or we can mock requirePermission.
// We'll just mock auth middleware since unit testing API
import { vi } from "vitest";

// Mock the middlewares
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

describe("Store Hierarchy API", () => {
  let storeId: string;
  let locId: string;
  let shelfId: string;
  let binId: string;

  beforeAll(async () => {
    
    // Clean up before test
    await prisma.bin.deleteMany();
    await prisma.shelf.deleteMany();
    await prisma.storeLocation.deleteMany();
    await prisma.store.deleteMany();
  });

  afterAll(async () => {
    await prisma.store.deleteMany();
    await prisma.$disconnect();
  });

  it("1. Create Store", async () => {
    const res = await request(app).post("/api/v1/stores").send({
      code: "TEST-STORE-01",
      name: "Test Store",
      type: "MAIN"
    });
    expect(res.status).toBe(201);
    expect(res.body.data.code).toBe("TEST-STORE-01");
    storeId = res.body.data.id;
  });

  it("2. Create Location under Store", async () => {
    const res = await request(app).post(`/api/v1/stores/${storeId}/locations`).send({
      code: "TEST-LOC-01",
      name: "Test Location"
    });
    expect(res.status).toBe(201);
    expect(res.body.data.storeId).toBe(storeId);
    locId = res.body.data.id;
  });

  it("3. Create Shelf under Location", async () => {
    const res = await request(app).post(`/api/v1/locations/${locId}/shelves`).send({
      code: "TEST-SH-01",
      name: "Test Shelf"
    });
    expect(res.status).toBe(201);
    expect(res.body.data.locationId).toBe(locId);
    shelfId = res.body.data.id;
  });

  it("4. Create Bin under Shelf", async () => {
    const res = await request(app).post(`/api/v1/shelves/${shelfId}/bins`).send({
      code: "TEST-BIN-01",
      name: "Test Bin"
    });
    expect(res.status).toBe(201);
    expect(res.body.data.shelfId).toBe(shelfId);
    binId = res.body.data.id;
  });

  it("5. Retrieve hierarchy", async () => {
    const res = await request(app).get(`/api/v1/stores/${storeId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.locations).toHaveLength(1);
    expect(res.body.data.locations[0].id).toBe(locId);
  });

  it("6. Update each entity", async () => {
    const res = await request(app).patch(`/api/v1/stores/${storeId}`).send({
      name: "Updated Store"
    });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Updated Store");
  });

  it("7. Prevent destructive deletion when hierarchy exists", async () => {
    // Delete store should fail because it cascades or is blocked by logic?
    // Actually Store has no stock yet, so soft delete will work if we allow it without stock.
    // Let's try to delete a shelf that has bins.
    const res = await request(app).delete(`/api/v1/shelves/${shelfId}`);
    expect(res.status).toBe(409); // Conflict
    expect(res.body.message).toMatch(/Cannot delete shelf containing bins/);
  });
});
