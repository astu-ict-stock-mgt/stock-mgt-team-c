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
  "requisitions.read", "requisitions.create", "requisitions.update", "requisitions.submit", "requisitions.approve", "requisitions.reject",
  "sivs.read", "sivs.create", "sivs.update", "sivs.submit", "sivs.approve", "sivs.amend", "sivs.reject", "sivs.finalize",
  "stocktakes.create", "stocktakes.read", "stocktakes.update", "stocktakes.submit", "stocktakes.review", "stocktakes.recount",
  "stockadjustments.read", "stockadjustments.approve", "stockadjustments.post",
  "damaged.manage", "obsolete.manage",
  "gatepass.request", "gatepass.approve", "gatepass.read",
  "reports.view", "reports.export", "audit.view",
  "dashboard.view",
  "returns.create", "returns.read", "returns.evaluate", "returns.approve", "returns.receive",
  "transfers.create", "transfers.read", "transfers.approve", "transfers.dispatch", "transfers.receive",
  "bintransfers.execute"
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
    "requisitions.read", "requisitions.approve", "requisitions.reject",
    "sivs.read", "sivs.approve", "sivs.amend", "sivs.reject",
    "stocktakes.read", "stocktakes.review", "stocktakes.recount",
    "stockadjustments.read", "stockadjustments.approve", "stockadjustments.post",
    "damaged.manage", "obsolete.manage",
    "gatepass.approve", "gatepass.read",
    "reports.view", "reports.export", "audit.view",
    "returns.read", "returns.approve",
    "transfers.read", "transfers.approve",
  ],
  STOREKEEPER: [
    "dashboard.view", "suppliers.read", "categories.read", 
    "stores.read", "locations.read", "shelves.read", "bins.read",
    "inventory.read", "inventory.update",
    "goods_receipts.read", "goods_receipts.create", "goods_receipts.update", "goods_receipts.submit",
    "grns.read", "grns.create",
    "stock.receive", "stock.issue", "stock.transfer",
    "requisitions.read", 
    "sivs.read", "sivs.create", "sivs.update", "sivs.submit", "sivs.finalize",
    "stocktakes.create", "stocktakes.read", "stocktakes.update", "stocktakes.submit",
    "damaged.manage", "obsolete.manage",
    "gatepass.request", "gatepass.read", "reports.view",
    "returns.read", "returns.create", "returns.receive",
    "transfers.read", "transfers.create", "transfers.dispatch", "transfers.receive",
    "bintransfers.execute"
  ],
  STOCK_CLERK: [
    "dashboard.view", "suppliers.read", "categories.read", 
    "stores.read", "locations.read", "shelves.read", "bins.read",
    "inventory.read", "requisitions.read", "sivs.read", "stocktakes.read", "reports.view",
  ],
  ACCOUNTANT: [
    "dashboard.view", "suppliers.read", "categories.read", 
    "stores.read", "locations.read", "shelves.read", "bins.read",
    "inventory.read", "requisitions.read", "sivs.read", "reports.view", "reports.export", "audit.view",
  ],
  DEPARTMENT_HEAD: [
    "dashboard.view", "inventory.read",
    "requisitions.read", "requisitions.create", "requisitions.update", "requisitions.submit", "requisitions.approve", "requisitions.reject", "reports.view",
    "returns.create", "returns.read",
    "transfers.create", "transfers.read",
  ],
  SECURITY_OFFICER: [
    "dashboard.view", "gatepass.approve", "gatepass.read", "inventory.read", "audit.view",
  ],
  SUPPLIER: ["dashboard.view"],
  TEC: [
    "dashboard.view", "inventory.read",
    "stores.read", "locations.read", "shelves.read", "bins.read",
    "goods_receipts.read",
    "technical_evaluations.read", "technical_evaluations.create", "technical_evaluations.approve", "technical_evaluations.reject",
    "returns.read", "returns.evaluate"
  ],
  FIXED_ASSET_OFFICER: ["dashboard.view", "stores.read", "locations.read", "shelves.read", "bins.read", "inventory.read"],
  AUDITOR: ["dashboard.view", "stores.read", "locations.read", "shelves.read", "bins.read", "inventory.read", "reports.view", "audit.view"],
};
