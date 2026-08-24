// Permission catalogue — drives RBAC enforcement on the backend.
// Each permission is module.action (e.g. "users.read", "stock.receive").

export const PERMISSIONS = [
  // Users & RBAC
  "users.read", "users.create", "users.update", "users.delete",
  "roles.read", "roles.manage",
  "permissions.read",

  // Suppliers
  "suppliers.read", "suppliers.create", "suppliers.update", "suppliers.delete",

  // Categories & UoM
  "categories.read", "categories.create", "categories.update", "categories.delete",

  // Warehouses
  "warehouses.read", "warehouses.create", "warehouses.update", "warehouses.delete",

  // Inventory
  "inventory.read", "inventory.create", "inventory.update", "inventory.delete",

  // Stock operations
  "stock.receive", "stock.issue", "stock.transfer", "stock.adjust",

  // Requisitions
  "requisition.create", "requisition.approve", "requisition.read",

  // Stock taking & adjustments
  "stocktakes.create", "stocktakes.read", "stocktakes.update", "stocktakes.submit", "stocktakes.review", "stocktakes.recount",
  "stockadjustments.read", "stockadjustments.approve", "stockadjustments.post",

  // Damaged / Obsolete
  "damaged.manage", "obsolete.manage",

  // Gate passes
  "gatepass.request", "gatepass.approve", "gatepass.read",

  // Reports & audit
  "reports.view", "reports.export", "audit.view",

  // Dashboard
  "dashboard.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type RoleName =
  | "ADMINISTRATOR"
  | "PAO"
  | "STOREKEEPER"
  | "STOCK_CLERK"
  | "ACCOUNTANT"
  | "DEPARTMENT_HEAD"
  | "SECURITY_OFFICER"
  | "SUPPLIER";

// Role → permissions mapping (used by the seeder to bootstrap RBAC).
export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  ADMINISTRATOR: [...PERMISSIONS],

  PAO: [
    "dashboard.view",
    "users.read",
    "suppliers.read", "suppliers.create", "suppliers.update",
    "categories.read",
    "warehouses.read",
    "inventory.read",
    "stock.receive", "stock.issue", "stock.transfer",
    "requisition.read", "requisition.approve",
    "stocktakes.read", "stocktakes.review", "stocktakes.recount",
    "stockadjustments.read", "stockadjustments.approve", "stockadjustments.post",
    "damaged.manage", "obsolete.manage",
    "gatepass.approve", "gatepass.read",
    "reports.view", "reports.export",
    "audit.view",
  ],

  STOREKEEPER: [
    "dashboard.view",
    "suppliers.read",
    "categories.read",
    "warehouses.read",
    "inventory.read", "inventory.update",
    "stock.receive", "stock.issue", "stock.transfer",
    "requisition.read",
    "stocktakes.create", "stocktakes.read", "stocktakes.update", "stocktakes.submit",
    "damaged.manage", "obsolete.manage",
    "gatepass.request", "gatepass.read",
    "reports.view",
  ],

  STOCK_CLERK: [
    "dashboard.view",
    "suppliers.read",
    "categories.read",
    "warehouses.read",
    "inventory.read",
    "requisition.read",
    "stocktakes.read",
    "reports.view",
  ],

  ACCOUNTANT: [
    "dashboard.view",
    "suppliers.read",
    "categories.read",
    "warehouses.read",
    "inventory.read",
    "requisition.read",
    "reports.view", "reports.export",
    "audit.view",
  ],

  DEPARTMENT_HEAD: [
    "dashboard.view",
    "inventory.read",
    "requisition.create", "requisition.approve", "requisition.read",
    "reports.view",
  ],

  SECURITY_OFFICER: [
    "dashboard.view",
    "gatepass.approve", "gatepass.read",
    "inventory.read",
    "audit.view",
  ],

  SUPPLIER: [
    "dashboard.view",
  ],
};
