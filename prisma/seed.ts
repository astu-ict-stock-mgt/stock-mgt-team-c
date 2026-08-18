// Seed script — bootstraps the Stock Management System with realistic demo data.
// Run with: bun run db:seed
//
// Seeds:
//   - All permissions (constant PERMISSIONS)
//   - All 8 roles (ADMINISTRATOR, PAO, STOREKEEPER, STOCK_CLERK, ACCOUNTANT, DEPARTMENT_HEAD, SECURITY_OFFICER, SUPPLIER)
//   - 8 demo users (one per role, password "Password@123")
//   - 6 categories + 6 units of measure
//   - 3 warehouses
//   - 5 suppliers
//   - 12 inventory items (with min/max/reorder/safety)
//   - 3 sample receipts (creates FIFO layers + warehouse stock + stock transactions)
//   - 2 sample issues (consumes FIFO layers, computes COGS)

import { db } from "../src/lib/db";
import { PERMISSIONS, ROLE_PERMISSIONS, RoleName } from "../src/lib/constants/permissions";
import { hashPassword } from "../src/lib/utils/crypto";
import { createReceipt } from "../src/lib/services/receipts";
import { createIssue } from "../src/lib/services/issues";

const DEFAULT_PASSWORD = "Password@123";

async function main() {
  console.log("🚀 Seeding Stock Management System...");

  // -------- Permissions --------
  console.log("• Seeding permissions...");
  for (const name of PERMISSIONS) {
    const moduleName = name.split(".")[0];
    await db.permission.upsert({
      where: { name },
      create: { name, module: moduleName },
      update: { module: moduleName },
    });
  }

  // -------- Roles + role_permissions --------
  console.log("• Seeding roles...");
  const roleNames = Object.keys(ROLE_PERMISSIONS) as RoleName[];
  for (const rn of roleNames) {
    const role = await db.role.upsert({
      where: { name: rn },
      create: {
        name: rn,
        description: roleDescription(rn),
      },
      update: { description: roleDescription(rn) },
    });
    // Sync permissions: delete + recreate (simple, deterministic)
    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    const perms = ROLE_PERMISSIONS[rn];
    for (const p of perms) {
      const perm = await db.permission.findUnique({ where: { name: p } });
      if (perm) {
        await db.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } }).catch(() => {});
      }
    }
  }

  // -------- Categories + UoMs --------
  console.log("• Seeding categories & UoMs...");
  const categories = [
    { code: "ELEC", name: "Electronics", description: "Computers, peripherals, accessories" },
    { code: "STAT", name: "Stationery", description: "Office supplies" },
    { code: "FURN", name: "Furniture", description: "Office furniture" },
    { code: "CLEAN", name: "Cleaning Supplies", description: "Janitorial supplies" },
    { code: "TOOL", name: "Tools & Hardware", description: "Hand tools, hardware" },
    { code: "CONS", name: "Consumables", description: "General consumables" },
  ];
  for (const c of categories) {
    await db.category.upsert({
      where: { code: c.code },
      create: c,
      update: { name: c.name, description: c.description },
    });
  }
  const uoms = [
    { code: "EA", name: "Each" },
    { code: "BOX", name: "Box" },
    { code: "KG", name: "Kilogram" },
    { code: "L", name: "Liter" },
    { code: "M", name: "Meter" },
    { code: "PKT", name: "Packet" },
  ];
  for (const u of uoms) {
    await db.unitOfMeasure.upsert({ where: { code: u.code }, create: u, update: { name: u.name } });
  }

  // -------- Warehouses --------
  console.log("• Seeding warehouses...");
  const warehouses = [
    { code: "WH-MAIN", name: "Main Warehouse", location: "Building A, Ground Floor" },
    { code: "WH-IT", name: "IT Storage", location: "Building B, Floor 2" },
    { code: "WH-STAT", name: "Stationery Store", location: "Building A, Floor 1" },
  ];
  for (const w of warehouses) {
    await db.warehouse.upsert({ where: { code: w.code }, create: w, update: { name: w.name, location: w.location } });
  }

  // -------- Suppliers --------
  console.log("• Seeding suppliers...");
  const suppliers = [
    { name: "TechDistrib PLC", contactPerson: "Abebe Kebede", email: "sales@techdistrib.et", phone: "+251911001122", address: "Bole, Addis Ababa" },
    { name: "Office Solutions Ltd", contactPerson: "Sara Mohammed", email: "info@officesolutions.et", phone: "+251911223344", address: "Merkato, Addis Ababa" },
    { name: "Global Furniture Co", contactPerson: "Dawit Tadesse", email: "sales@globalfurniture.et", phone: "+251911445566", address: "Akaki Kality" },
    { name: "CleanPro Supplies", contactPerson: "Helen Girma", email: "info@cleanpro.et", phone: "+251911667788", address: "Lideta, Addis Ababa" },
    { name: "HardwareWorld", contactPerson: "Yonas Bekele", email: "sales@hardwareworld.et", phone: "+251911889900", address: "Piazza, Addis Ababa" },
  ];
  for (const s of suppliers) {
    const existing = await db.supplier.findFirst({ where: { name: s.name, deletedAt: null } });
    if (!existing) {
      await db.supplier.create({ data: { code: `SUP-${String(Math.floor(Math.random() * 9000) + 1000)}`, ...s, status: "ACTIVE" } });
    }
  }

  // -------- Users (one per role) --------
  console.log("• Seeding demo users...");
  const users = [
    { email: "admin@sms.et", username: "admin", fullName: "System Administrator", department: "IT", role: "ADMINISTRATOR" as RoleName },
    { email: "pao@sms.et", username: "pao", fullName: "Property Admin Officer", department: "Administration", role: "PAO" as RoleName },
    { email: "storekeeper@sms.et", username: "storekeeper", fullName: "Main Storekeeper", department: "Stores", role: "STOREKEEPER" as RoleName },
    { email: "clerk@sms.et", username: "clerk", fullName: "Stock Clerk", department: "Stores", role: "STOCK_CLERK" as RoleName },
    { email: "accountant@sms.et", username: "accountant", fullName: "Senior Accountant", department: "Finance", role: "ACCOUNTANT" as RoleName },
    { email: "depthead@sms.et", username: "depthead", fullName: "IT Department Head", department: "IT", role: "DEPARTMENT_HEAD" as RoleName },
    { email: "security@sms.et", username: "security", fullName: "Security Officer", department: "Security", role: "SECURITY_OFFICER" as RoleName },
    { email: "supplier@sms.et", username: "supplier", fullName: "Supplier User", department: "External", role: "SUPPLIER" as RoleName },
  ];
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  for (const u of users) {
    const existing = await db.user.findUnique({ where: { email: u.email } });
    let user;
    if (existing) {
      user = await db.user.update({ where: { id: existing.id }, data: { passwordHash, status: "ACTIVE", fullName: u.fullName, department: u.department } });
    } else {
      user = await db.user.create({ data: { email: u.email, username: u.username, fullName: u.fullName, passwordHash, status: "ACTIVE", department: u.department } });
    }
    const role = await db.role.findUnique({ where: { name: u.role } });
    if (role) {
      await db.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, create: { userId: user.id, roleId: role.id }, update: {} });
    }
  }

  // -------- Inventory items --------
  console.log("• Seeding inventory items...");
  const adminUser = await db.user.findUnique({ where: { email: "admin@sms.et" } });
  const items = [
    { code: "IT-LP-001", name: "Dell Latitude 5520 Laptop", categoryCode: "ELEC", uomCode: "EA", minStock: 5, maxStock: 50, safetyStock: 8, reorderLevel: 10 },
    { code: "IT-MN-002", name: "Dell 24-inch Monitor", categoryCode: "ELEC", uomCode: "EA", minStock: 10, maxStock: 100, safetyStock: 15, reorderLevel: 20 },
    { code: "IT-KB-003", name: "Mechanical Keyboard", categoryCode: "ELEC", uomCode: "EA", minStock: 20, maxStock: 200, safetyStock: 25, reorderLevel: 30 },
    { code: "ST-PA-001", name: "A4 Paper Ream", categoryCode: "STAT", uomCode: "BOX", minStock: 30, maxStock: 500, safetyStock: 40, reorderLevel: 50 },
    { code: "ST-PN-002", name: "Ballpoint Pen (Blue)", categoryCode: "STAT", uomCode: "BOX", minStock: 15, maxStock: 200, safetyStock: 20, reorderLevel: 25 },
    { code: "FU-CH-001", name: "Office Chair (Ergonomic)", categoryCode: "FURN", uomCode: "EA", minStock: 5, maxStock: 50, safetyStock: 8, reorderLevel: 10 },
    { code: "FU-DS-002", name: "Adjustable Standing Desk", categoryCode: "FURN", uomCode: "EA", minStock: 3, maxStock: 30, safetyStock: 5, reorderLevel: 8 },
    { code: "CL-DS-001", name: "Industrial Dish Soap (5L)", categoryCode: "CLEAN", uomCode: "L", minStock: 10, maxStock: 100, safetyStock: 15, reorderLevel: 20 },
    { code: "CL-GL-002", name: "Glass Cleaner (1L)", categoryCode: "CLEAN", uomCode: "EA", minStock: 15, maxStock: 150, safetyStock: 20, reorderLevel: 25 },
    { code: "TL-HM-001", name: "Hammer (16oz)", categoryCode: "TOOL", uomCode: "EA", minStock: 8, maxStock: 60, safetyStock: 10, reorderLevel: 15 },
    { code: "TL-SD-002", name: "Screwdriver Set (10pc)", categoryCode: "TOOL", uomCode: "EA", minStock: 12, maxStock: 100, safetyStock: 15, reorderLevel: 20 },
    { code: "CS-TP-001", name: "Thermal Printer Rolls", categoryCode: "CONS", uomCode: "PKT", minStock: 20, maxStock: 200, safetyStock: 25, reorderLevel: 30 },
  ];
  for (const it of items) {
    const cat = await db.category.findUnique({ where: { code: it.categoryCode } });
    const uom = await db.unitOfMeasure.findUnique({ where: { code: it.uomCode } });
    if (!cat || !uom) continue;
    const existing = await db.inventoryItem.findUnique({ where: { code: it.code } });
    if (existing) {
      await db.inventoryItem.update({
        where: { id: existing.id },
        data: { name: it.name, categoryId: cat.id, uomId: uom.id, minStock: it.minStock, maxStock: it.maxStock, safetyStock: it.safetyStock, reorderLevel: it.reorderLevel },
      });
    } else {
      await db.inventoryItem.create({
        data: { code: it.code, name: it.name, categoryId: cat.id, uomId: uom.id, minStock: it.minStock, maxStock: it.maxStock, safetyStock: it.safetyStock, reorderLevel: it.reorderLevel },
      });
    }
  }

  // -------- Requisitions --------
  console.log("• Seeding requisitions...");
  const [admin, pao, deptHead, storekeeperUser] = await Promise.all([
    db.user.findUnique({ where: { email: "admin@sms.et" } }),
    db.user.findUnique({ where: { email: "pao@sms.et" } }),
    db.user.findUnique({ where: { email: "depthead@sms.et" } }),
    db.user.findUnique({ where: { email: "storekeeper@sms.et" } }),
  ]);
  const laptop = await db.inventoryItem.findUnique({ where: { code: "IT-LP-001" } });
  const monitor = await db.inventoryItem.findUnique({ where: { code: "IT-MN-002" } });
  const paper = await db.inventoryItem.findUnique({ where: { code: "ST-PA-001" } });
  const chair = await db.inventoryItem.findUnique({ where: { code: "FU-CH-001" } });

  const requisitionSeeds = [
    {
      code: "REQ-20260813-0001",
      requestedById: deptHead?.id,
      department: "IT",
      status: "SUBMITTED" as const,
      requiredDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      notes: "Replacement laptops for new staff",
      items: laptop ? [{ itemId: laptop.id, quantity: 2 }] : [],
      approvals: pao ? [{ approverId: pao.id, status: "APPROVED" as const, comments: "Reviewed and approved" }] : [],
    },
    {
      code: "REQ-20260813-0002",
      requestedById: deptHead?.id,
      department: "IT",
      status: "PENDING_APPROVAL" as const,
      requiredDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      notes: "Monitors and paperwork for lab setup",
      items: [
        ...(monitor ? [{ itemId: monitor.id, quantity: 3 }] : []),
        ...(paper ? [{ itemId: paper.id, quantity: 10 }] : []),
      ],
      approvals: [],
    },
    {
      code: "REQ-20260813-0003",
      requestedById: admin?.id,
      department: "Administration",
      status: "APPROVED" as const,
      requiredDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      notes: "Office seating for visitor room",
      items: chair ? [{ itemId: chair.id, quantity: 4 }] : [],
      approvals: storekeeperUser
        ? [{ approverId: storekeeperUser.id, status: "APPROVED" as const, comments: "Stock reserved for pickup" }]
        : [],
    },
  ];

  for (const seed of requisitionSeeds) {
    if (!seed.requestedById || seed.items.length === 0) continue;
    const existing = await db.requisition.findUnique({ where: { code: seed.code } });
    if (existing) {
      await db.requisitionItem.deleteMany({ where: { requisitionId: existing.id } });
      await db.requisitionApproval.deleteMany({ where: { requisitionId: existing.id } });
      await db.requisition.update({
        where: { id: existing.id },
        data: {
          requestedById: seed.requestedById,
          department: seed.department,
          status: seed.status,
          requiredDate: seed.requiredDate,
          notes: seed.notes,
        },
      });
      for (const item of seed.items) {
        await db.requisitionItem.create({ data: { requisitionId: existing.id, itemId: item.itemId, quantity: item.quantity, fulfilledQty: 0 } });
      }
      for (const approval of seed.approvals) {
        await db.requisitionApproval.create({ data: { requisitionId: existing.id, ...approval } });
      }
      continue;
    }

    const requisition = await db.requisition.create({
      data: {
        code: seed.code,
        requestedById: seed.requestedById,
        department: seed.department,
        status: seed.status,
        requiredDate: seed.requiredDate,
        notes: seed.notes,
      },
    });
    for (const item of seed.items) {
      await db.requisitionItem.create({ data: { requisitionId: requisition.id, itemId: item.itemId, quantity: item.quantity, fulfilledQty: 0 } });
    }
    for (const approval of seed.approvals) {
      await db.requisitionApproval.create({ data: { requisitionId: requisition.id, ...approval } });
    }
  }

  // -------- Sample receipts (creates FIFO layers) --------
  console.log("• Seeding sample receipts (FIFO layers)...");

  const storekeeper = await db.user.findUnique({ where: { email: "storekeeper@sms.et" } });
  const whMain = await db.warehouse.findUnique({ where: { code: "WH-MAIN" } });
  const whIT = await db.warehouse.findUnique({ where: { code: "WH-IT" } });
  const whStat = await db.warehouse.findUnique({ where: { code: "WH-STAT" } });
  const suppliersDb = await db.supplier.findMany({ where: { deletedAt: null } });
  const itemLaptop = await db.inventoryItem.findUnique({ where: { code: "IT-LP-001" } });
  const itemMonitor = await db.inventoryItem.findUnique({ where: { code: "IT-MN-002" } });
  const itemKeyboard = await db.inventoryItem.findUnique({ where: { code: "IT-KB-003" } });
  const itemPaper = await db.inventoryItem.findUnique({ where: { code: "ST-PA-001" } });
  const itemChair = await db.inventoryItem.findUnique({ where: { code: "FU-CH-001" } });
  const itemDesk = await db.inventoryItem.findUnique({ where: { code: "FU-DS-002" } });

  if (storekeeper && whMain && whIT && whStat && suppliersDb.length >= 4 && itemLaptop && itemMonitor && itemKeyboard && itemPaper && itemChair && itemDesk) {
    // Only seed if no receipts exist yet
    const existingReceipts = await db.stockReceipt.count();
    if (existingReceipts === 0) {
      // Receipt 1: laptops + monitors to IT warehouse
      await createReceipt({
        supplierId: suppliersDb[0].id,
        warehouseId: whIT.id,
        receivedById: storekeeper.id,
        inspectionNotes: "All items inspected. No damage detected.",
        items: [
          { itemId: itemLaptop.id, quantity: 20, unitCost: 35000 }, // ETB
          { itemId: itemMonitor.id, quantity: 30, unitCost: 8500 },
          { itemId: itemKeyboard.id, quantity: 50, unitCost: 1200 },
        ],
      }, { userId: storekeeper.id });

      // Receipt 2: more laptops (different unit cost → FIFO test)
      await createReceipt({
        supplierId: suppliersDb[0].id,
        warehouseId: whIT.id,
        receivedById: storekeeper.id,
        inspectionNotes: "Second batch — slightly higher price.",
        items: [
          { itemId: itemLaptop.id, quantity: 10, unitCost: 36500 },
        ],
      }, { userId: storekeeper.id });

      // Receipt 3: paper + chairs to main warehouse
      await createReceipt({
        supplierId: suppliersDb[1].id,
        warehouseId: whMain.id,
        receivedById: storekeeper.id,
        inspectionNotes: "Standard office supplies.",
        items: [
          { itemId: itemPaper.id, quantity: 100, unitCost: 350 },
          { itemId: itemChair.id, quantity: 25, unitCost: 4500 },
          { itemId: itemDesk.id, quantity: 10, unitCost: 12500 },
        ],
      }, { userId: storekeeper.id });

      // Issue some laptops to IT department (tests FIFO consumption + COGS)
      const existingIssues = await db.stockIssue.count();
      if (existingIssues === 0) {
        await createIssue({
          sourceWarehouseId: whIT.id,
          issuedById: storekeeper.id,
          department: "IT",
          notes: "Issue for new developers.",
          items: [
            { itemId: itemLaptop.id, quantity: 12 }, // should consume all 20 @ 35000 + 0 @ 36500... actually 12 < 20, so 12 @ 35000 only
            { itemId: itemMonitor.id, quantity: 5 },
            { itemId: itemKeyboard.id, quantity: 10 },
          ],
        }, { userId: storekeeper.id });
      }
    } else {
      console.log("  (skipping receipts — already exist)");
    }
  } else {
    console.log("  (skipping receipts — missing prerequisites)");
  }

  console.log("");
  console.log("✅ Seeding complete.");
  console.log("");
  console.log("Demo credentials (password for ALL users): " + DEFAULT_PASSWORD);
  console.log("  admin@sms.et         — Administrator (full access)");
  console.log("  pao@sms.et           — Property Admin Officer");
  console.log("  storekeeper@sms.et   — Storekeeper");
  console.log("  clerk@sms.et         — Stock Clerk");
  console.log("  accountant@sms.et    — Accountant");
  console.log("  depthead@sms.et      — Department Head");
  console.log("  security@sms.et      — Security Officer");
  console.log("  supplier@sms.et      — Supplier");
}

function roleDescription(role: RoleName): string {
  switch (role) {
    case "ADMINISTRATOR": return "Full system access";
    case "PAO": return "Property Administration Officer — approves requests, monitors inventory";
    case "STOREKEEPER": return "Receives and issues stock, manages warehouse operations";
    case "STOCK_CLERK": return "Maintains stock records, prepares reports";
    case "ACCOUNTANT": return "Inventory valuation, financial reports";
    case "DEPARTMENT_HEAD": return "Department requisitions and approvals";
    case "SECURITY_OFFICER": return "Gate passes and material exit control";
    case "SUPPLIER": return "External supplier — limited view";
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  });
