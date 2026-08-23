export const PERMISSIONS = [
  "users.read", "users.create", "users.update", "users.delete",
  "roles.read", "roles.manage",
  "permissions.read",
  "suppliers.read", "suppliers.create", "suppliers.update", "suppliers.delete",
  "categories.read", "categories.create", "categories.update", "categories.delete",
  "stores.read", "stores.create", "stores.update", "stores.delete",
  "locations.read", "locations.create", "locations.update", "locations.delete",
  "shelves.read", "shelves.create", "shelves.update", "shelves.delete",
  "bins.read", "bins.create", "bins.update", "bins.delete",
  "goods_receipts.read", "goods_receipts.create", "goods_receipts.update", "goods_receipts.submit",
  "technical_evaluations.read", "technical_evaluations.create", "technical_evaluations.approve", "technical_evaluations.reject",
  "grns.read", "grns.create",
  "inventory.read", "inventory.create", "inventory.update", "inventory.delete",
  "stock.receive", "stock.issue", "stock.transfer", "stock.adjust",
  "requisition.create", "requisition.approve", "requisition.read",
  "stocktake.create", "stocktake.approve", "stocktake.read",
  "damaged.manage", "obsolete.manage",
  "gatepass.request", "gatepass.approve", "gatepass.read",
  "reports.view", "reports.export", "audit.view",
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
  | "SUPPLIER"
  | "TEC"
  | "FIXED_ASSET_OFFICER"
  | "AUDITOR";

export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  ADMINISTRATOR: [...PERMISSIONS],
  PAO: [
    "dashboard.view", "users.read",
    "suppliers.read", "suppliers.create", "suppliers.update",
    "categories.read", "stores.read", "stores.create", "stores.update", "stores.delete", 
    "locations.read", "locations.create", "locations.update", "locations.delete",
    "shelves.read", "shelves.create", "shelves.update", "shelves.delete",
    "bins.read", "bins.create", "bins.update", "bins.delete", "inventory.read",
    "goods_receipts.read", "goods_receipts.create", "goods_receipts.update", "goods_receipts.submit",
    "technical_evaluations.read", "technical_evaluations.create", "technical_evaluations.approve", "technical_evaluations.reject",
    "grns.read", "grns.create",
    "stock.receive", "stock.issue", "stock.transfer",
    "requisition.read", "requisition.approve",
    "stocktake.read", "stocktake.approve",
    "damaged.manage", "obsolete.manage",
    "gatepass.approve", "gatepass.read",
    "reports.view", "reports.export", "audit.view",
  ],
  STOREKEEPER: [
    "dashboard.view", "suppliers.read", "categories.read", 
    "stores.read", "locations.read", "shelves.read", "bins.read",
    "inventory.read", "inventory.update",
    "goods_receipts.read", "goods_receipts.create", "goods_receipts.update", "goods_receipts.submit",
    "grns.read", "grns.create",
    "stock.receive", "stock.issue", "stock.transfer",
    "requisition.read", "stocktake.create", "stocktake.read",
    "damaged.manage", "obsolete.manage",
    "gatepass.request", "gatepass.read", "reports.view",
  ],
  STOCK_CLERK: [
    "dashboard.view", "suppliers.read", "categories.read", 
    "stores.read", "locations.read", "shelves.read", "bins.read",
    "inventory.read", "requisition.read", "stocktake.read", "reports.view",
  ],
  ACCOUNTANT: [
    "dashboard.view", "suppliers.read", "categories.read", 
    "stores.read", "locations.read", "shelves.read", "bins.read",
    "inventory.read", "requisition.read", "reports.view", "reports.export", "audit.view",
  ],
  DEPARTMENT_HEAD: [
    "dashboard.view", "inventory.read",
    "requisition.create", "requisition.approve", "requisition.read", "reports.view",
  ],
  SECURITY_OFFICER: [
    "dashboard.view", "gatepass.approve", "gatepass.read", "inventory.read", "audit.view",
  ],
  SUPPLIER: ["dashboard.view"],
  TEC: [
    "dashboard.view", "inventory.read",
    "stores.read", "locations.read", "shelves.read", "bins.read",
    "goods_receipts.read",
    "technical_evaluations.read", "technical_evaluations.create", "technical_evaluations.approve", "technical_evaluations.reject"
  ],
  FIXED_ASSET_OFFICER: ["dashboard.view", "stores.read", "locations.read", "shelves.read", "bins.read", "inventory.read"],
  AUDITOR: ["dashboard.view", "stores.read", "locations.read", "shelves.read", "bins.read", "inventory.read", "reports.view", "audit.view"],
};
