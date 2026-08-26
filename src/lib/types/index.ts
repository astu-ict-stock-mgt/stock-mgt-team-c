// Shared types between frontend and backend (matched to Prisma models).

export type UserRole = {
  id: string;
  name: string;
  description?: string | null;
  permissions: string[];
};

export type CurrentUser = {
  id: string;
  email: string;
  username: string;
  fullName: string;
  status: string;
  department: string | null;
  phoneNumber: string | null;
  lastLoginAt: string | null;
  roles: {
    id: string;
    name: string;
    description?: string | null;
    permissions: string[];
  }[];
};

export type AuthSession = {
  user: CurrentUser;
  token: string;
  refresh: string;
  expiresAt: string;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type Supplier = {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: string;
  receiptCount: number;
  createdAt: string;
};

export type Category = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  itemCount: number;
};

export type Store = {
  id: string;
  code: string;
  name: string;
  location: string | null;
  status: string;
  itemCount: number;
  totalUnits: number;
};

export type Uom = { id: string; code: string; name: string };

export type InventoryItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  minStock: number;
  maxStock: number;
  safetyStock: number;
  reorderLevel: number;
  unitCost: number;
  category: { id: string; name: string };
  uom: { id: string; code: string; name: string };
  totalQuantity: number;
  totalValue: number;
};

export type InventoryItemDetail = InventoryItem & {
  storeStock: Array<{
    id: string;
    storeId: string;
    storeCode: string;
    storeName: string;
    quantity: number;
    reservedQty: number;
  }>;
  avgUnitCost: number;
  fifoLayers: Array<{
    id: string;
    originalQty: number;
    remainingQty: number;
    unitCost: number;
    createdAt: string;
  }>;
  recentTransactions: Array<{
    id: string;
    code: string;
    type: string;
    quantity: number;
    unitCost: number;
    balanceAfter: number;
    referenceType: string | null;
    referenceId: string | null;
    remarks: string | null;
    transactionDate: string;
    user: string | null;
    store: string | null;
  }>;
};

export type Receipt = {
  id: string;
  code: string;
  supplier: { id: string; code: string; name: string };
  store: { id: string; code: string; name: string };
  receivedBy: { id: string; fullName: string };
  status: string;
  totalAmount: number;
  totalQuantity: number;
  itemCount: number;
  receiptDate: string;
  inspectionNotes: string | null;
};

export type ReceiptDetail = Receipt & {
  createdAt: string;
  items: Array<{
    id: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    uom: string;
    quantity: number;
    unitCost: number;
    total: number;
    inspected: boolean;
    inspectionPassed: boolean;
    remarks: string | null;
  }>;
  fifoLayers: Array<{
    id: string;
    originalQty: number;
    remainingQty: number;
    unitCost: number;
  }>;
};

export type Issue = {
  id: string;
  code: string;
  sourceStore: { id: string; code: string; name: string };
  destStore: { id: string; code: string; name: string } | null;
  issuedBy: { id: string; fullName: string };
  department: string;
  status: string;
  totalQuantity: number;
  totalCogs: number;
  itemCount: number;
  issueDate: string;
  notes: string | null;
};

export type IssueDetail = Issue & {
  items: Array<{
    id: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    uom: string;
    quantity: number;
    unitCost: number;
    cogs: number;
    remarks: string | null;
  }>;
  gatePass: { id: string; code: string; status: string } | null;
};

export type Transfer = {
  id: string;
  code: string;
  fromStore: { id: string; code: string; name: string };
  toStore: { id: string; code: string; name: string };
  transferredBy: { id: string; fullName: string };
  status: string;
  totalQuantity: number;
  itemCount: number;
  transferDate: string;
  notes: string | null;
};

export type TransferDetail = Omit<Transfer, "fromStore" | "toStore" | "itemCount"> & {
  fromStore: Store;
  toStore: Store;
  items: Array<{
    id: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    uom: string;
    quantity: number;
    unitCost: number;
  }>;
};

export type Requisition = {
  id: string;
  code: string;
  requestedBy: { id: string; fullName: string; email: string; department: string | null };
  department: string;
  status: string;
  requiredDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  approvalCount: number;
  items: Array<{
    id: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    quantity: number;
    fulfilledQty: number;
  }>;
  latestApproval: null | {
    id: string;
    status: string;
    approver: { id: string; fullName: string; email: string };
    approvedAt: string;
    comments: string | null;
  };
};

export type AuditLog = {
  id: string;
  action: string;
  module: string;
  entity: string | null;
  entityId: string | null;
  user: { id: string; fullName: string; email: string } | null;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  description: string | null;
  timestamp: string;
};

export type DashboardKpi = {
  label: string;
  value: number;
  icon: string;
  format?: "currency" | "number";
  variant?: "default" | "warning" | "danger" | "muted";
};

export type DashboardStats = {
  role: string;
  kpis: DashboardKpi[];
  charts?: Record<string, Array<{ label: string; value: number; quantity?: number }>>;
  recentTransactions?: Array<Record<string, unknown>>;
  recentReceipts?: Array<Record<string, unknown>>;
  recentIssues?: Array<Record<string, unknown>>;
  storeStock?: Array<Record<string, unknown>>;
  recentRequisitions?: Array<Record<string, unknown>>;
  recentApprovedRequisitions?: Array<Record<string, unknown>>;
  recentGatePasses?: Array<Record<string, unknown>>;
  department?: string | null;
};

export type RequisitionListResponse = Paginated<Requisition>;

export type InventoryReport = {
  totalItems: number;
  totalValue: number;
  totalQuantity: number;
  lowStockCount: number;
  outOfStockCount: number;
  items: Array<{
    code: string;
    name: string;
    category: string;
    uom: string;
    status: string;
    quantity: number;
    unitCost: number;
    totalValue: number;
    minStock: number;
    maxStock: number;
    reorderLevel: number;
    safetyStock: number;
    isLowStock: boolean;
    isOutOfStock: boolean;
  }>;
};

export type ValuationReport = {
  totalItems: number;
  totalValue: number;
  totalQuantity: number;
  items: Array<{
    code: string;
    name: string;
    category: string;
    uom: string;
    quantity: number;
    avgUnitCost: number;
    totalValue: number;
    fifoLayers: number;
    layers: Array<{
      id: string;
      originalQty: number;
      remainingQty: number;
      unitCost: number;
      createdAt: string;
    }>;
  }>;
};

export type MovementReportItem = {
  id: string;
  code: string;
  type: string;
  itemCode: string | null;
  itemName: string | null;
  uom: string | null;
  quantity: number;
  unitCost: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  user: string | null;
  store: string | null;
  remarks: string | null;
  transactionDate: string;
};

export type Role = {
  id: string;
  name: string;
  description: string | null;
  userCount: number;
  permissions: string[];
};

/* ── Stock taking ──────────────────────────────────────────────────────── */

export type StockTakeStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "RECONCILED";

export type StockTake = {
  id: string;
  code: string;
  store: { id: string; code: string; name: string };
  conductedBy: { id: string; fullName: string };
  status: StockTakeStatus;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  itemCount: number;
  countedCount: number;
  varianceCount: number;
};

export type StockTakeItem = {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  uom: string;
  systemQty: number;
  /** null until the line has actually been counted. */
  physicalQty: number | null;
  variance: number | null;
  remarks: string | null;
};

export type StockTakeDetail = StockTake & {
  /** Surplus and shortage are kept apart so they cannot cancel out in a summary. */
  surplusQty: number;
  shortageQty: number;
  items: StockTakeItem[];
};

/* ── Damaged & obsolete stock ──────────────────────────────────────────── */

export type DispositionKind = "damaged" | "obsolete";

export type DispositionStatus = "REPORTED" | "APPROVED" | "DISPOSED" | "CANCELLED";

export type Disposition = {
  id: string;
  item: { id: string; code: string; name: string; uom: string };
  store: { id: string; code: string; name: string } | null;
  quantity: number;
  reason: string;
  reportedBy: { id: string; fullName: string } | null;
  status: DispositionStatus;
  disposalDate: string | null;
  disposalMethod: string | null;
  createdAt: string;
  updatedAt: string;
};

/* ── Gate passes ───────────────────────────────────────────────────────── */

export type GatePassStatus = "PENDING" | "APPROVED" | "EXIT_CONFIRMED" | "REJECTED" | "CANCELLED";

export type GatePass = {
  id: string;
  code: string;
  status: GatePassStatus;
  requestedBy: { id: string; fullName: string; department: string | null };
  securityOfficer: { id: string; fullName: string } | null;
  issue: {
    id: string;
    code: string;
    department: string;
    totalQuantity: number;
    issueDate: string;
    sourceStore: { id: string; code: string; name: string };
  } | null;
  carrier: string | null;
  vehiclePlate: string | null;
  exitConfirmedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
