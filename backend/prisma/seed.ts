import { PrismaClient } from "@prisma/client";
import { PERMISSIONS, ROLE_PERMISSIONS, RoleName } from "../src/config/permissions";
import { hashPassword } from "../src/utils/crypto";

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = "Password@123";

async function main() {
  console.log("🚀 Seeding ASTU Stock Management backend...");

  // Permissions
  console.log("• Seeding permissions...");
  for (const name of PERMISSIONS) {
    const moduleName = name.split(".")[0];
    await prisma.permission.upsert({ where: { name }, create: { name, module: moduleName }, update: {} });
  }

  // Roles
  console.log("• Seeding roles...");
  for (const rn of Object.keys(ROLE_PERMISSIONS) as RoleName[]) {
    const role = await prisma.role.upsert({ where: { name: rn }, create: { name: rn, description: roleDescription(rn) }, update: {} });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const p of ROLE_PERMISSIONS[rn]) {
      const perm = await prisma.permission.findUnique({ where: { name: p } });
      if (perm) await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } }).catch(() => {});
    }
  }

  // Categories + UoMs
  console.log("• Seeding categories & UoMs...");
  const categories = [
    { code: "ELEC", name: "Electronics", description: "Computers, peripherals" },
    { code: "STAT", name: "Stationery", description: "Office supplies" },
    { code: "FURN", name: "Furniture", description: "Office furniture" },
    { code: "CLEAN", name: "Cleaning Supplies", description: "Janitorial supplies" },
    { code: "TOOL", name: "Tools & Hardware", description: "Hand tools" },
  ];
  for (const c of categories) await prisma.category.upsert({ where: { code: c.code }, create: c, update: {} });
  const uoms = [{ code: "EA", name: "Each" }, { code: "BOX", name: "Box" }, { code: "KG", name: "Kilogram" }, { code: "L", name: "Liter" }];
  for (const u of uoms) await prisma.unitOfMeasure.upsert({ where: { code: u.code }, create: u, update: {} });

  // Stores
  console.log("• Seeding stores...");
  const stores = [
    { code: "WH-MAIN", name: "Main Warehouse", location: "Building A" },
    { code: "WH-IT", name: "IT Storage", location: "Building B" },
  ];
  for (const w of stores) await prisma.store.upsert({ where: { code: w.code }, create: w, update: {} });

  // Suppliers
  console.log("• Seeding suppliers...");
  const suppliers = [
    { name: "TechDistrib PLC", contactPerson: "Abebe Kebede", email: "sales@techdistrib.et", phone: "+251911001122", address: "Bole, Addis Ababa" },
    { name: "Office Solutions Ltd", contactPerson: "Sara Mohammed", email: "info@officesolutions.et", phone: "+251911223344", address: "Merkato, Addis Ababa" },
    { name: "Global Furniture Co", contactPerson: "Dawit Tadesse", email: "sales@globalfurniture.et", phone: "+251911445566", address: "Akaki Kality" },
  ];
  for (const s of suppliers) {
    const existing = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (!existing) await prisma.supplier.create({ data: { code: `SUP-${String(Math.floor(Math.random() * 9000) + 1000)}`, ...s, status: "ACTIVE" } });
  }

  // Users
  console.log("• Seeding demo users...");
  const users = [
    { email: "admin@sms.et", username: "admin", fullName: "System Administrator", department: "IT", role: "ADMINISTRATOR" as RoleName },
    { email: "pao@sms.et", username: "pao", fullName: "Property Admin Officer", department: "Administration", role: "PAO" as RoleName },
    { email: "storekeeper@sms.et", username: "storekeeper", fullName: "Main Storekeeper", department: "Stores", role: "STOREKEEPER" as RoleName },
    { email: "clerk@sms.et", username: "clerk", fullName: "Stock Clerk", department: "Stores", role: "STOCK_CLERK" as RoleName },
    { email: "accountant@sms.et", username: "accountant", fullName: "Senior Accountant", department: "Finance", role: "ACCOUNTANT" as RoleName },
    { email: "depthead@sms.et", username: "depthead", fullName: "IT Department Head", department: "IT", role: "DEPARTMENT_HEAD" as RoleName },
    { email: "security@sms.et", username: "security", fullName: "Security Officer", department: "Security", role: "SECURITY_OFFICER" as RoleName },
  ];
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    let user;
    if (existing) {
      user = await prisma.user.update({ where: { id: existing.id }, data: { passwordHash, status: "ACTIVE", fullName: u.fullName, department: u.department } });
    } else {
      user = await prisma.user.create({ data: { email: u.email, username: u.username, fullName: u.fullName, passwordHash, status: "ACTIVE", department: u.department } });
    }
    const role = await prisma.role.findUnique({ where: { name: u.role } });
    if (role) await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, create: { userId: user.id, roleId: role.id }, update: {} });
  }

  // Inventory items
  console.log("• Seeding inventory items...");
  const items = [
    { code: "IT-LP-001", name: "Dell Latitude 5520 Laptop", categoryCode: "ELEC", uomCode: "EA", minStock: 5, maxStock: 50, safetyStock: 8, reorderLevel: 10 },
    { code: "IT-MN-002", name: "Dell 24-inch Monitor", categoryCode: "ELEC", uomCode: "EA", minStock: 10, maxStock: 100, safetyStock: 15, reorderLevel: 20 },
    { code: "ST-PA-001", name: "A4 Paper Ream", categoryCode: "STAT", uomCode: "BOX", minStock: 30, maxStock: 500, safetyStock: 40, reorderLevel: 50 },
    { code: "FU-CH-001", name: "Office Chair (Ergonomic)", categoryCode: "FURN", uomCode: "EA", minStock: 5, maxStock: 50, safetyStock: 8, reorderLevel: 10 },
    { code: "CL-DS-001", name: "Industrial Dish Soap (5L)", categoryCode: "CLEAN", uomCode: "L", minStock: 10, maxStock: 100, safetyStock: 15, reorderLevel: 20 },
    { code: "TL-HM-001", name: "Hammer (16oz)", categoryCode: "TOOL", uomCode: "EA", minStock: 8, maxStock: 60, safetyStock: 10, reorderLevel: 15 },
  ];
  for (const it of items) {
    const cat = await prisma.category.findUnique({ where: { code: it.categoryCode } });
    const uom = await prisma.unitOfMeasure.findUnique({ where: { code: it.uomCode } });
    if (!cat || !uom) continue;
    const existing = await prisma.inventoryItem.findUnique({ where: { code: it.code } });
    if (!existing) {
      await prisma.inventoryItem.create({ data: { code: it.code, name: it.name, categoryId: cat.id, uomId: uom.id, minStock: it.minStock, maxStock: it.maxStock, safetyStock: it.safetyStock, reorderLevel: it.reorderLevel } });
    }
  }

  // Requisitions
  console.log("• Seeding requisitions...");
  const [admin, pao, deptHead, storekeeper] = await Promise.all([
    prisma.user.findUnique({ where: { email: "admin@sms.et" } }),
    prisma.user.findUnique({ where: { email: "pao@sms.et" } }),
    prisma.user.findUnique({ where: { email: "depthead@sms.et" } }),
    prisma.user.findUnique({ where: { email: "storekeeper@sms.et" } }),
  ]);
  const laptop = await prisma.inventoryItem.findUnique({ where: { code: "IT-LP-001" } });
  const monitor = await prisma.inventoryItem.findUnique({ where: { code: "IT-MN-002" } });
  const paper = await prisma.inventoryItem.findUnique({ where: { code: "ST-PA-001" } });
  const chair = await prisma.inventoryItem.findUnique({ where: { code: "FU-CH-001" } });

  const requisitionSeeds = [
    { code: "REQ-20260813-0001", requestedById: deptHead?.id, department: "IT", status: "SUBMITTED" as const, requiredDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), notes: "Replacement laptops for new staff", items: laptop ? [{ itemId: laptop.id, quantity: 2 }] : [], approvals: pao ? [{ approverId: pao.id, status: "APPROVED" as const, comments: "Reviewed and approved" }] : [] },
    { code: "REQ-20260813-0002", requestedById: deptHead?.id, department: "IT", status: "UNDER_REVIEW" as const, requiredDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), notes: "Monitors and paperwork for lab setup", items: [ ...(monitor ? [{ itemId: monitor.id, quantity: 3 }] : []), ...(paper ? [{ itemId: paper.id, quantity: 10 }] : []) ], approvals: [] },
    { code: "REQ-20260813-0003", requestedById: admin?.id, department: "Administration", status: "APPROVED" as const, requiredDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), notes: "Office seating for visitor room", items: chair ? [{ itemId: chair.id, quantity: 4 }] : [], approvals: storekeeper ? [{ approverId: storekeeper.id, status: "APPROVED" as const, comments: "Stock reserved for pickup" }] : [] },
  ];

  for (const seed of requisitionSeeds) {
    if (!seed.requestedById || seed.items.length === 0) continue;
    const existing = await prisma.requisition.findUnique({ where: { code: seed.code } });
    if (existing) {
      await prisma.requisitionItem.deleteMany({ where: { requisitionId: existing.id } });
      await prisma.requisitionApproval.deleteMany({ where: { requisitionId: existing.id } });
      await prisma.requisition.update({ where: { id: existing.id }, data: { requestedById: seed.requestedById, department: seed.department, status: seed.status, requiredDate: seed.requiredDate, notes: seed.notes } });
      for (const item of seed.items) await prisma.requisitionItem.create({ data: { requisitionId: existing.id, itemId: item.itemId, quantity: item.quantity, fulfilledQty: 0 } });
      for (const approval of seed.approvals) await prisma.requisitionApproval.create({ data: { requisitionId: existing.id, ...approval } });
      continue;
    }

    const req = await prisma.requisition.create({ data: { code: seed.code, requestedById: seed.requestedById, department: seed.department, status: seed.status, requiredDate: seed.requiredDate, notes: seed.notes } });
    for (const item of seed.items) await prisma.requisitionItem.create({ data: { requisitionId: req.id, itemId: item.itemId, quantity: item.quantity, fulfilledQty: 0 } });
    for (const approval of seed.approvals) await prisma.requisitionApproval.create({ data: { requisitionId: req.id, ...approval } });
  }

  console.log("");
  console.log("✅ Backend seed complete.");
  console.log(`   Demo password for all users: ${DEFAULT_PASSWORD}`);
  console.log("   Login: admin@sms.et / pao@sms.et / storekeeper@sms.et / etc.");
}

function roleDescription(role: RoleName): string {
  switch (role) {
    case "ADMINISTRATOR": return "Full system access";
    case "PAO": return "Property Administration Officer";
    case "STOREKEEPER": return "Receives and issues stock";
    case "STOCK_CLERK": return "Maintains stock records";
    case "ACCOUNTANT": return "Inventory valuation, financial reports";
    case "DEPARTMENT_HEAD": return "Department requisitions and approvals";
    case "SECURITY_OFFICER": return "Gate passes and material exit control";
    case "SUPPLIER": return "External supplier — limited view";
    case "TEC": return "Technical Evaluation Committee";
    case "FIXED_ASSET_OFFICER": return "Fixed Asset Registration";
    case "AUDITOR": return "System Auditor";
  }
  return "";
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); });
