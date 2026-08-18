// Role-aware dashboard statistics.
// Returns different KPI sets based on the user's roles.

import { db } from "@/lib/db";
import { computeStockValue } from "@/lib/services/fifo";

export async function getDashboardStats(roles: Set<string>, userId: string) {
  if (roles.has("ADMINISTRATOR") || roles.has("PAO")) {
    return adminDashboard();
  }
  if (roles.has("STOREKEEPER")) {
    return storekeeperDashboard();
  }
  if (roles.has("ACCOUNTANT")) {
    return accountantDashboard();
  }
  if (roles.has("DEPARTMENT_HEAD")) {
    return departmentHeadDashboard(userId);
  }
  if (roles.has("SECURITY_OFFICER")) {
    return securityOfficerDashboard();
  }
  return basicDashboard();
}

async function adminDashboard() {
  const [
    totalItems,
    lowStockItems,
    outOfStockItems,
    totalSuppliers,
    totalWarehouses,
    totalReceipts,
    totalIssues,
    damagedItems,
    obsoleteItems,
    pendingRequisitions,
    recentTransactions,
    recentReceipts,
    recentIssues,
  ] = await Promise.all([
    db.inventoryItem.count({ where: { deletedAt: null } }),
    db.inventoryItem.count({ where: { deletedAt: null, status: "LOW_STOCK" } }),
    db.inventoryItem.count({ where: { deletedAt: null, status: "OUT_OF_STOCK" } }),
    db.supplier.count({ where: { deletedAt: null } }),
    db.warehouse.count({ where: { deletedAt: null } }),
    db.stockReceipt.count(),
    db.stockIssue.count(),
    db.damagedStock.count({ where: { status: { in: ["REPORTED", "APPROVED"] } } }),
    db.obsoleteStock.count({ where: { status: { in: ["REPORTED", "APPROVED"] } } }),
    db.requisition.count({ where: { status: { in: ["SUBMITTED", "PENDING_APPROVAL"] } } }),
    db.stockTransaction.findMany({ orderBy: { transactionDate: "desc" }, take: 10, include: { item: true, user: true, warehouse: true } }),
    db.stockReceipt.findMany({ orderBy: { receiptDate: "desc" }, take: 5, include: { supplier: true, warehouse: true } }),
    db.stockIssue.findMany({ orderBy: { issueDate: "desc" }, take: 5, include: { sourceWarehouse: true } }),
  ]);

  // Total stock value
  const items = await db.inventoryItem.findMany({ where: { deletedAt: null }, select: { id: true } });
  let totalStockValue = 0;
  for (const it of items) {
    const v = await computeStockValue(it.id);
    totalStockValue += v.value;
  }

  // Items by status
  const statusCounts = await db.inventoryItem.groupBy({ by: ["status"], where: { deletedAt: null }, _count: true });

  return {
    role: "ADMINISTRATOR",
    kpis: [
      { label: "Total Items", value: totalItems, icon: "Package" },
      { label: "Total Stock Value", value: totalStockValue, icon: "DollarSign", format: "currency" },
      { label: "Low Stock Items", value: lowStockItems, icon: "AlertTriangle", variant: "warning" },
      { label: "Out of Stock", value: outOfStockItems, icon: "PackageX", variant: "danger" },
      { label: "Total Suppliers", value: totalSuppliers, icon: "Truck" },
      { label: "Total Warehouses", value: totalWarehouses, icon: "Warehouse" },
      { label: "Total Receipts", value: totalReceipts, icon: "ArrowDownToLine" },
      { label: "Total Issues", value: totalIssues, icon: "ArrowUpFromLine" },
      { label: "Damaged Stock", value: damagedItems, icon: "AlertOctagon", variant: "danger" },
      { label: "Obsolete Stock", value: obsoleteItems, icon: "Archive", variant: "muted" },
      { label: "Pending Requests", value: pendingRequisitions, icon: "Clock", variant: "warning" },
    ],
    charts: {
      inventoryByStatus: statusCounts.map((s) => ({ label: s.status, value: s._count })),
    },
    recentTransactions: recentTransactions.map((t) => ({
      id: t.id,
      code: t.code,
      item: t.item?.code ?? null,
      type: t.type,
      quantity: t.quantity,
      unitCost: t.unitCost,
      user: t.user?.fullName ?? null,
      warehouse: t.warehouse?.code ?? null,
      transactionDate: t.transactionDate.toISOString(),
    })),
    recentReceipts: recentReceipts.map((r) => ({
      id: r.id,
      code: r.code,
      supplier: r.supplier?.name ?? null,
      warehouse: r.warehouse?.code ?? null,
      totalAmount: r.totalAmount,
      totalQuantity: r.totalQuantity,
      receiptDate: r.receiptDate.toISOString(),
    })),
    recentIssues: recentIssues.map((i) => ({
      id: i.id,
      code: i.code,
      department: i.department,
      warehouse: i.sourceWarehouse?.code ?? null,
      totalQuantity: i.totalQuantity,
      totalCogs: i.totalCogs,
      issueDate: i.issueDate.toISOString(),
    })),
  };
}

async function storekeeperDashboard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    todaysReceipts,
    todaysIssues,
    pendingRequisitions,
    readyForIssue,
    lowStockItems,
    recentTransactions,
    warehouseStock,
    recentApprovedRequisitions,
  ] = await Promise.all([
    db.stockReceipt.count({ where: { receiptDate: { gte: today } } }),
    db.stockIssue.count({ where: { issueDate: { gte: today } } }),
    db.requisition.count({ where: { status: { in: ["SUBMITTED", "PENDING_APPROVAL", "APPROVED"] } } }),
    db.requisition.count({ where: { status: "APPROVED" } }),
    db.inventoryItem.count({ where: { deletedAt: null, status: "LOW_STOCK" } }),
    db.stockTransaction.findMany({ orderBy: { transactionDate: "desc" }, take: 10, include: { item: true, user: true, warehouse: true } }),
    db.warehouseStock.findMany({ where: { quantity: { gt: 0 } }, include: { item: { include: { uom: true } }, warehouse: true }, orderBy: { updatedAt: "desc" }, take: 10 }),
    db.requisition.findMany({
      where: { status: "APPROVED" },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: {
        requestedBy: { select: { id: true, fullName: true, email: true, department: true } },
        _count: { select: { items: true, approvals: true } },
        items: { include: { item: { select: { id: true, code: true, name: true } } } },
        approvals: { include: { approver: { select: { id: true, fullName: true, email: true } } }, orderBy: { approvedAt: "desc" }, take: 1 },
      },
    }),
  ]);

  return {
    role: "STOREKEEPER",
    kpis: [
      { label: "Today's Receipts", value: todaysReceipts, icon: "ArrowDownToLine" },
      { label: "Today's Issues", value: todaysIssues, icon: "ArrowUpFromLine" },
      { label: "Pending Requisitions", value: pendingRequisitions, icon: "Clock", variant: "warning" },
      { label: "Ready for Issue", value: readyForIssue, icon: "FileText", variant: "default" },
      { label: "Low Stock Items", value: lowStockItems, icon: "AlertTriangle", variant: "warning" },
    ],
    recentTransactions: recentTransactions.map((t) => ({
      id: t.id,
      code: t.code,
      item: t.item?.code ?? null,
      type: t.type,
      quantity: t.quantity,
      user: t.user?.fullName ?? null,
      warehouse: t.warehouse?.code ?? null,
      transactionDate: t.transactionDate.toISOString(),
    })),
    warehouseStock: warehouseStock.map((ws) => ({
      id: ws.id,
      itemCode: ws.item.code,
      itemName: ws.item.name,
      uom: ws.item.uom.code,
      warehouse: ws.warehouse.code,
      quantity: ws.quantity,
      reservedQty: ws.reservedQty,
    })),
    recentApprovedRequisitions: recentApprovedRequisitions.map((r) => ({
      id: r.id,
      code: r.code,
      requestedBy: r.requestedBy.fullName,
      department: r.department,
      status: r.status,
      itemCount: r._count.items,
      approvalCount: r._count.approvals,
      items: r.items.map((item) => ({
        itemId: item.itemId,
        itemCode: item.item.code,
        itemName: item.item.name,
        quantity: item.quantity,
      })),
      latestApproval: r.approvals[0]
        ? {
            status: r.approvals[0].status,
            approver: r.approvals[0].approver.fullName,
            approvedAt: r.approvals[0].approvedAt.toISOString(),
          }
        : null,
      updatedAt: r.updatedAt.toISOString(),
    })),
  };
}

async function accountantDashboard() {
  const items = await db.inventoryItem.findMany({ where: { deletedAt: null }, select: { id: true } });
  let totalInventoryValue = 0;
  const byCategory: Record<string, { value: number; quantity: number }> = {};
  for (const it of items) {
    const v = await computeStockValue(it.id);
    totalInventoryValue += v.value;
  }

  const itemsWithCat = await db.inventoryItem.findMany({
    where: { deletedAt: null },
    include: { category: true },
  });
  for (const it of itemsWithCat) {
    const v = await computeStockValue(it.id);
    const cat = it.category?.name ?? "Uncategorized";
    if (!byCategory[cat]) byCategory[cat] = { value: 0, quantity: 0 };
    byCategory[cat].value += v.value;
    byCategory[cat].quantity += v.quantity;
  }

  const byWarehouseRaw = await db.warehouseStock.findMany({ include: { item: true, warehouse: true } });
  const byWarehouse: Record<string, number> = {};
  for (const ws of byWarehouseRaw) {
    const v = await computeStockValue(ws.itemId, ws.warehouseId);
    const w = ws.warehouse?.name ?? "Unknown";
    byWarehouse[w] = (byWarehouse[w] ?? 0) + v.value;
  }

  // Last 30 days movement
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const movements = await db.stockTransaction.findMany({
    where: { transactionDate: { gte: since }, type: { in: ["RECEIPT", "ISSUE"] } },
    orderBy: { transactionDate: "asc" },
    select: { type: true, quantity: true, unitCost: true, transactionDate: true },
  });

  return {
    role: "ACCOUNTANT",
    kpis: [
      { label: "Total Inventory Value", value: totalInventoryValue, icon: "DollarSign", format: "currency" },
      { label: "Total Items", value: items.length, icon: "Package" },
      { label: "Categories", value: Object.keys(byCategory).length, icon: "FolderTree" },
      { label: "Warehouses w/ Stock", value: Object.keys(byWarehouse).length, icon: "Warehouse" },
    ],
    charts: {
      stockValueByCategory: Object.entries(byCategory).map(([label, v]) => ({ label, value: v.value, quantity: v.quantity })),
      stockValueByWarehouse: Object.entries(byWarehouse).map(([label, value]) => ({ label, value })),
      movement: movements.map((m) => ({
        date: m.transactionDate.toISOString(),
        type: m.type,
        quantity: m.quantity,
        value: Math.abs(m.quantity) * m.unitCost,
      })),
    },
  };
}

async function departmentHeadDashboard(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  const department = user?.department ?? null;

  const [myRequisitions, pendingApprovals, issuedItems, recentIssues] = await Promise.all([
    db.requisition.count({ where: { requestedById: userId } }),
    db.requisition.count({ where: { status: { in: ["SUBMITTED", "PENDING_APPROVAL"] } } }),
    db.stockIssue.count({ where: department ? { department } : {} }),
    db.stockIssue.findMany({
      where: department ? { department, status: "COMPLETED" } : { status: "COMPLETED" },
      orderBy: { issueDate: "desc" },
      take: 5,
      include: { sourceWarehouse: true, _count: { select: { items: true } } },
    }),
  ]);

  return {
    role: "DEPARTMENT_HEAD",
    department,
    kpis: [
      { label: "My Requisitions", value: myRequisitions, icon: "FileText" },
      { label: "Pending Approvals", value: pendingApprovals, icon: "Clock", variant: "warning" },
      { label: "Issued to Department", value: issuedItems, icon: "PackageCheck" },
    ],
    recentIssues: recentIssues.map((issue) => ({
      id: issue.id,
      code: issue.code,
      department: issue.department,
      warehouse: issue.sourceWarehouse?.code ?? null,
      totalQuantity: issue.totalQuantity,
      totalCogs: issue.totalCogs,
      issueDate: issue.issueDate.toISOString(),
      itemCount: issue._count.items,
    })),
  };
}

async function securityOfficerDashboard() {
  const [pendingGatePasses, approvedGatePasses, totalExits] = await Promise.all([
    db.gatePass.count({ where: { status: "PENDING" } }),
    db.gatePass.count({ where: { status: "APPROVED" } }),
    db.gatePass.count({ where: { status: "EXIT_CONFIRMED" } }),
  ]);

  const recentGatePasses = await db.gatePass.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { issue: true, requestedBy: true },
  });

  return {
    role: "SECURITY_OFFICER",
    kpis: [
      { label: "Pending Gate Passes", value: pendingGatePasses, icon: "ShieldAlert", variant: "warning" },
      { label: "Approved Gate Passes", value: approvedGatePasses, icon: "ShieldCheck" },
      { label: "Material Exits", value: totalExits, icon: "LogOut" },
    ],
    recentGatePasses: recentGatePasses.map((g) => ({
      id: g.id,
      code: g.code,
      status: g.status,
      issueCode: g.issue?.code ?? null,
      requestedBy: g.requestedBy?.fullName ?? null,
      createdAt: g.createdAt.toISOString(),
    })),
  };
}

async function basicDashboard() {
  return {
    role: "BASIC",
    kpis: [],
  };
}
