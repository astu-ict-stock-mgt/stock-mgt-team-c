import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { recordAudit } from "./audit";

// -------------------------------------------------------------------
// STORE CRUD
// -------------------------------------------------------------------

export async function listStores(params: { search?: string; status?: string }) {
  const where: Prisma.StoreWhereInput = {};
  if (params.search) {
    where.OR = [
      { code: { contains: params.search, mode: "insensitive" } },
      { name: { contains: params.search, mode: "insensitive" } },
    ];
  }
  if (params.status) {
    where.status = params.status as any;
  }
  where.deletedAt = null;

  return prisma.store.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { locations: true } } },
  });
}

export async function getStore(id: string) {
  const store = await prisma.store.findUnique({
    where: { id },
    include: { locations: { include: { _count: { select: { shelves: true } } } } },
  });
  if (!store || store.deletedAt) throw Errors.notFound("Store", id);
  return store;
}

export async function createStore(data: any, auditCtx?: { userId?: string; ip?: string }) {
  const store = await prisma.store.create({ data });
  await recordAudit({
    ctx: { userId: auditCtx?.userId, ipAddress: auditCtx?.ip },
    action: "CREATED", module: "stores", entity: "store", entityId: store.id, newValue: store,
  });
  return store;
}

export async function updateStore(id: string, data: any, auditCtx?: { userId?: string; ip?: string }) {
  const store = await prisma.store.update({ where: { id }, data });
  await recordAudit({
    ctx: { userId: auditCtx?.userId, ipAddress: auditCtx?.ip },
    action: "UPDATED", module: "stores", entity: "store", entityId: store.id, newValue: store,
  });
  return store;
}

export async function deleteStore(id: string, auditCtx?: { userId?: string; ip?: string }) {
  const store = await prisma.store.findUnique({
    where: { id },
    include: { _count: { select: { receipts: true, sivs: true, stockTransactions: true } } },
  });
  if (!store) throw Errors.notFound("Store", id);

  if (store._count.receipts > 0 || store._count.sivs > 0 || store._count.stockTransactions > 0) {
    throw Errors.conflict("Cannot delete store with existing stock history or documents. Please set status to INACTIVE instead.");
  }

  // Soft delete
  await prisma.store.update({ where: { id }, data: { deletedAt: new Date(), status: "INACTIVE" } });

  await recordAudit({
    ctx: { userId: auditCtx?.userId, ipAddress: auditCtx?.ip },
    action: "DELETED", module: "stores", entity: "store", entityId: id,
  });
  return { success: true };
}

// -------------------------------------------------------------------
// STORE LOCATION CRUD
// -------------------------------------------------------------------

export async function listLocations(storeId: string) {
  return prisma.storeLocation.findMany({
    where: { storeId },
    orderBy: { name: "asc" },
    include: { _count: { select: { shelves: true } } },
  });
}

export async function getLocation(id: string) {
  const loc = await prisma.storeLocation.findUnique({
    where: { id },
    include: { shelves: { include: { _count: { select: { bins: true } } } } },
  });
  if (!loc) throw Errors.notFound("Location", id);
  return loc;
}

export async function createLocation(storeId: string, data: any, auditCtx?: { userId?: string; ip?: string }) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store || store.deletedAt) throw Errors.notFound("Store", storeId);

  const loc = await prisma.storeLocation.create({
    data: { ...data, storeId },
  });

  await recordAudit({
    ctx: { userId: auditCtx?.userId, ipAddress: auditCtx?.ip },
    action: "CREATED", module: "locations", entity: "location", entityId: loc.id, newValue: loc,
  });
  return loc;
}

export async function updateLocation(id: string, data: any, auditCtx?: { userId?: string; ip?: string }) {
  const loc = await prisma.storeLocation.update({ where: { id }, data });
  await recordAudit({
    ctx: { userId: auditCtx?.userId, ipAddress: auditCtx?.ip },
    action: "UPDATED", module: "locations", entity: "location", entityId: loc.id, newValue: loc,
  });
  return loc;
}

export async function deleteLocation(id: string, auditCtx?: { userId?: string; ip?: string }) {
  const loc = await prisma.storeLocation.findUnique({
    where: { id },
    include: { shelves: { include: { _count: { select: { bins: true } } } } },
  });
  if (!loc) throw Errors.notFound("Location", id);

  // Check if any bins under these shelves have stock
  for (const shelf of loc.shelves) {
    if (shelf._count.bins > 0) {
       // Ideally we check stock, but as a basic rule, don't delete if it has bins.
       throw Errors.conflict("Cannot delete location containing shelves and bins. Remove them first.");
    }
  }

  await prisma.storeLocation.delete({ where: { id } });

  await recordAudit({
    ctx: { userId: auditCtx?.userId, ipAddress: auditCtx?.ip },
    action: "DELETED", module: "locations", entity: "location", entityId: id,
  });
  return { success: true };
}

// -------------------------------------------------------------------
// SHELF CRUD
// -------------------------------------------------------------------

export async function listShelves(locationId: string) {
  return prisma.shelf.findMany({
    where: { locationId },
    orderBy: { name: "asc" },
    include: { _count: { select: { bins: true } } },
  });
}

export async function getShelf(id: string) {
  const shelf = await prisma.shelf.findUnique({
    where: { id },
    include: { bins: { include: { _count: { select: { binStocks: true } } } } },
  });
  if (!shelf) throw Errors.notFound("Shelf", id);
  return shelf;
}

export async function createShelf(locationId: string, data: any, auditCtx?: { userId?: string; ip?: string }) {
  const loc = await prisma.storeLocation.findUnique({ where: { id: locationId } });
  if (!loc) throw Errors.notFound("Location", locationId);

  const shelf = await prisma.shelf.create({
    data: { ...data, locationId },
  });

  await recordAudit({
    ctx: { userId: auditCtx?.userId, ipAddress: auditCtx?.ip },
    action: "CREATED", module: "shelves", entity: "shelf", entityId: shelf.id, newValue: shelf,
  });
  return shelf;
}

export async function updateShelf(id: string, data: any, auditCtx?: { userId?: string; ip?: string }) {
  const shelf = await prisma.shelf.update({ where: { id }, data });
  await recordAudit({
    ctx: { userId: auditCtx?.userId, ipAddress: auditCtx?.ip },
    action: "UPDATED", module: "shelves", entity: "shelf", entityId: shelf.id, newValue: shelf,
  });
  return shelf;
}

export async function deleteShelf(id: string, auditCtx?: { userId?: string; ip?: string }) {
  const shelf = await prisma.shelf.findUnique({
    where: { id },
    include: { _count: { select: { bins: true } } },
  });
  if (!shelf) throw Errors.notFound("Shelf", id);

  if (shelf._count.bins > 0) {
    throw Errors.conflict("Cannot delete shelf containing bins. Remove them first.");
  }

  await prisma.shelf.delete({ where: { id } });

  await recordAudit({
    ctx: { userId: auditCtx?.userId, ipAddress: auditCtx?.ip },
    action: "DELETED", module: "shelves", entity: "shelf", entityId: id,
  });
  return { success: true };
}

// -------------------------------------------------------------------
// BIN CRUD
// -------------------------------------------------------------------

export async function listBins(shelfId: string) {
  return prisma.bin.findMany({
    where: { shelfId },
    orderBy: { name: "asc" },
  });
}

export async function getBin(id: string) {
  const bin = await prisma.bin.findUnique({
    where: { id },
    include: { binStocks: { include: { item: true } } },
  });
  if (!bin) throw Errors.notFound("Bin", id);
  return bin;
}

export async function createBin(shelfId: string, data: any, auditCtx?: { userId?: string; ip?: string }) {
  const shelf = await prisma.shelf.findUnique({ where: { id: shelfId } });
  if (!shelf) throw Errors.notFound("Shelf", shelfId);

  const bin = await prisma.bin.create({
    data: { ...data, shelfId },
  });

  await recordAudit({
    ctx: { userId: auditCtx?.userId, ipAddress: auditCtx?.ip },
    action: "CREATED", module: "bins", entity: "bin", entityId: bin.id, newValue: bin,
  });
  return bin;
}

export async function updateBin(id: string, data: any, auditCtx?: { userId?: string; ip?: string }) {
  const bin = await prisma.bin.update({ where: { id }, data });
  await recordAudit({
    ctx: { userId: auditCtx?.userId, ipAddress: auditCtx?.ip },
    action: "UPDATED", module: "bins", entity: "bin", entityId: bin.id, newValue: bin,
  });
  return bin;
}

export async function deleteBin(id: string, auditCtx?: { userId?: string; ip?: string }) {
  const bin = await prisma.bin.findUnique({
    where: { id },
    include: { binStocks: true, binCards: true },
  });
  if (!bin) throw Errors.notFound("Bin", id);

  const hasStock = bin.binStocks.some((bs) => bs.quantity > 0 || bs.reservedQty > 0);
  if (hasStock || bin.binCards.length > 0) {
    throw Errors.conflict("Cannot delete bin that contains active stock or historical transactions.");
  }

  await prisma.bin.delete({ where: { id } });

  await recordAudit({
    ctx: { userId: auditCtx?.userId, ipAddress: auditCtx?.ip },
    action: "DELETED", module: "bins", entity: "bin", entityId: id,
  });
  return { success: true };
}
