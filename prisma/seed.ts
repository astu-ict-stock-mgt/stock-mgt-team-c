// Seed script for Phase 1 Stock Management System (PostgreSQL Domain Foundation)

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const db = new PrismaClient();
const DEFAULT_PASSWORD = "Password@123";

async function main() {
  console.log("🚀 Seeding Stock Management System (Phase 1)...");

  // 1. Roles
  console.log("• Seeding roles...");
  const rolesData = [
    { name: "ADMINISTRATOR", description: "Full system access" },
    { name: "PAO", description: "Property Administration Officer" },
    { name: "STOREKEEPER", description: "Receives and issues stock, manages store operations" },
    { name: "STOCK_CLERK", description: "Maintains stock records, prepares reports" },
    { name: "ACCOUNTANT", description: "Inventory valuation, financial reports" },
    { name: "DEPARTMENT_HEAD", description: "Department requisitions and approvals" },
    { name: "SECURITY_OFFICER", description: "Gate passes and material exit control" },
    { name: "SUPPLIER", description: "External supplier" },
    { name: "TEC", description: "Technical Evaluation Committee" },
    { name: "FIXED_ASSET_OFFICER", description: "Manages fixed assets" },
    { name: "AUDITOR", description: "Read-only auditor" },
  ];

  for (const r of rolesData) {
    await db.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: { name: r.name, description: r.description },
    });
  }

  // 2. Users
  console.log("• Seeding users...");
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const usersData = [
    { email: "admin@sms.et", username: "admin", fullName: "System Administrator", role: "ADMINISTRATOR" },
    { email: "pao@sms.et", username: "pao", fullName: "Property Admin Officer", role: "PAO" },
    { email: "storekeeper@sms.et", username: "storekeeper", fullName: "Main Storekeeper", role: "STOREKEEPER" },
    { email: "clerk@sms.et", username: "clerk", fullName: "Stock Clerk", role: "STOCK_CLERK" },
    { email: "tec@sms.et", username: "tec", fullName: "TEC Member", role: "TEC" },
    { email: "depthead@sms.et", username: "depthead", fullName: "IT Department Head", role: "DEPARTMENT_HEAD" },
    { email: "asset@sms.et", username: "asset", fullName: "Fixed Asset Officer", role: "FIXED_ASSET_OFFICER" },
  ];

  for (const u of usersData) {
    let user = await db.user.findUnique({ where: { email: u.email } });
    if (!user) {
      user = await db.user.create({
        data: {
          email: u.email,
          username: u.username,
          fullName: u.fullName,
          passwordHash,
          status: "ACTIVE",
        },
      });
    }
    const role = await db.role.findUnique({ where: { name: u.role } });
    if (role) {
      await db.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        create: { userId: user.id, roleId: role.id },
        update: {},
      });
    }
  }

  // 3. Categories & UOMs
  console.log("• Seeding categories & UOMs...");
  const categories = [
    { code: "ELEC", name: "Electronics", description: "Computers, peripherals, accessories" },
    { code: "STAT", name: "Stationery", description: "Office supplies" },
    { code: "FURN", name: "Furniture", description: "Office furniture" },
  ];
  for (const c of categories) {
    await db.category.upsert({ where: { code: c.code }, create: c, update: c });
  }

  const uoms = [
    { code: "EA", name: "Each" },
    { code: "BOX", name: "Box" },
    { code: "PKT", name: "Packet" },
  ];
  for (const u of uoms) {
    await db.unitOfMeasure.upsert({ where: { code: u.code }, create: u, update: u });
  }

  // 4. Stores, Locations, Shelves, Bins
  console.log("• Seeding Store Hierarchy...");
  const mainStore = await db.store.upsert({
    where: { code: "WH-MAIN" },
    create: { code: "WH-MAIN", name: "Main Store", type: "MAIN", location: "Building A", status: "ACTIVE" },
    update: { name: "Main Store" },
  });

  const locA = await db.storeLocation.upsert({
    where: { storeId_code: { storeId: mainStore.id, code: "LOC-A" } },
    create: { storeId: mainStore.id, code: "LOC-A", name: "Zone A (Electronics)" },
    update: {},
  });

  const shelf1 = await db.shelf.upsert({
    where: { locationId_code: { locationId: locA.id, code: "SH-01" } },
    create: { locationId: locA.id, code: "SH-01", name: "Shelf 1" },
    update: {},
  });

  await db.bin.upsert({
    where: { shelfId_code: { shelfId: shelf1.id, code: "BIN-01-A" } },
    create: { shelfId: shelf1.id, code: "BIN-01-A", name: "Bin A1" },
    update: {},
  });

  // 5. Suppliers
  console.log("• Seeding suppliers...");
  const supp1 = await db.supplier.upsert({
    where: { code: "SUP-001" },
    create: { code: "SUP-001", name: "TechDistrib PLC", email: "sales@techdistrib.et", status: "ACTIVE" },
    update: {},
  });

  // 6. Items
  console.log("• Seeding items...");
  const elecCat = await db.category.findUnique({ where: { code: "ELEC" } });
  const eaUom = await db.unitOfMeasure.findUnique({ where: { code: "EA" } });

  if (elecCat && eaUom) {
    await db.inventoryItem.upsert({
      where: { code: "IT-LP-001" },
      create: {
        code: "IT-LP-001",
        name: "Dell Latitude 5520 Laptop",
        categoryId: elecCat.id,
        uomId: eaUom.id,
        materialType: "FIXED_ASSET",
        minStock: 5,
        maxStock: 50,
      },
      update: {},
    });
    await db.inventoryItem.upsert({
      where: { code: "IT-MN-002" },
      create: {
        code: "IT-MN-002",
        name: "Dell 24-inch Monitor",
        categoryId: elecCat.id,
        uomId: eaUom.id,
        materialType: "FIXED_ASSET",
        minStock: 10,
        maxStock: 100,
      },
      update: {},
    });
  }

  console.log("✅ Seeding complete.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  });
