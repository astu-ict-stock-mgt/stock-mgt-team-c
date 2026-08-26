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

export type StockTakeItem = {
  id: string;
  itemId: string;
  binId: string;
  systemQty: number | null;
  physicalQty: number | null;
  variance: number | null;
  remarks: string | null;
  unitCostOverride: number | null;
  item: { id: string; code: string; name: string };
  bin: { id: string; code: string; name: string };
};

export type StockAdjustmentItem = {
  id: string;
  itemId: string;
  binId: string;
  variance: number;
  unitCost: number | null;
  remarks: string | null;
  item: { id: string; code: string; name: string };
  bin: { id: string; code: string; name: string };
};

export type StockAdjustment = {
  id: string;
  code: string;
  storeId: string;
  stockTakeId: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  store?: Store;
  stockTake?: { id: string; code: string; status: string } | null;
  requestedBy?: { id: string; fullName: string };
  approvedBy?: { id: string; fullName: string } | null;
  items: StockAdjustmentItem[];
};

export type StockTake = {
  id: string;
  code: string;
  storeId: string;
  conductedById: string;
  status: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  store: Store;
  conductedBy: { id: string; fullName: string };
  items: StockTakeItem[];
  adjustment?: StockAdjustment | null;
};

export type StoreBinStock = {
  id: string;
  itemId: string;
  binId: string;
  quantity: number;
  reservedQty: number;
  item: { id: string; code: string; name: string };
  bin: {
    id: string;
    code: string;
    name: string;
    shelf: { id: string; code: string; name: string; location: { id: string; code: string; name: string } };
  };
};
export type StoreReturnItem = {
  id: string;
  itemId: string;
  itemCode?: string | null;
  itemName?: string | null;
  quantity: number;
  acceptedQty: number | null;
  reason: string | null;
  condition: string | null;
  unitCost: number | null;
  allocations?: Array<{ id: string; binId: string; quantity: number }>;
};

export type StoreReturn = {
  id: string;
  code: string;
  storeId: string;
  store?: { id: string; code: string; name: string };
  department: string | null;
  originalSivId: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  requestedBy?: { id: string; fullName: string };
  items?: StoreReturnItem[];
};

export type TransferRequestItem = {
  id: string;
  itemId: string;
  item?: { id: string; code: string; name: string };
  quantity: number;
  dispatchedQty: number;
  receivedQty: number;
  outAllocations?: Array<{ id: string; binId: string; quantity: number }>;
  inAllocations?: Array<{ id: string; binId: string; quantity: number }>;
};

export type TransferRequest = {
  id: string;
  code: string;
  fromStoreId: string;
  fromStore?: { id: string; code: string; name: string };
  toStoreId: string;
  toStore?: { id: string; code: string; name: string };
  reason: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  requestedBy?: { id: string; fullName: string };
  items?: TransferRequestItem[];
};

export type BinTransfer = {
  id: string;
  code: string;
  storeId: string;
  itemId: string;
  item?: { id: string; code: string; name: string };
  fromBinId: string;
  fromBin?: { id: string; code: string; name: string };
  toBinId: string;
  toBin?: { id: string; code: string; name: string };
  quantity: number;
  status: string;
  createdAt: string;
  requestedBy?: { id: string; fullName: string };
};
