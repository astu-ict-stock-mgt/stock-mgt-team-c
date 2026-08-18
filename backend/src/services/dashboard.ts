import { prisma } from "../config/db";
import { computeStockValue } from "./fifo";

export async function getDashboardStats(roles: Set<string>, userId: string) {
  if (roles.has("ADMINISTRATOR") || roles.has("PAO")) return adminDashboard();
  if (roles.has("STOREKEEPER")) return storekeeperDashboard();
  if (roles.has("ACCOUNTANT")) return accountantDashboard();
  if (roles.has("DEPARTMENT_HEAD")) return departmentHeadDashboard(userId);
  if (roles.has("SECURITY_OFFICER")) return securityOfficerDashboard();
  return { role: "BASIC", kpis: [] };
}

async function adminDashboard() {
  const [totalItems, lowStockItems, outOfStockItems, totalSuppliers, totalWarehouses, totalReceipts, totalIssues, damagedItems, obsoleteItems, pendingRequisitions, recentTransactions, recentReceipts, recentIssues] = await Promise.all([
    prisma.inventoryItem.count({ where: { deletedAt: null } }),
    prisma.inventoryItem.count({ where: { deletedAt: null, status: "LOW_STOCK" } }),
    prisma.inventoryItem.count({ where: { deletedAt: null, status: "OUT_OF_STOCK" } }),
    prisma.supplier.count({ where: { deletedAt: null } }),
    prisma.warehouse.count({ where: { deletedAt: null } }),
    prisma.stockReceipt.count(),
    prisma.stockIssue.count(),
    prisma.damagedStock.count({ where: { status: { in: ["REPORTED", "APPROVED"] } } }),
    prisma.obsoleteStock.count({ where: { status: { in: ["REPORTED", "APPROVED"] } } }),
    prisma.requisition.count({ where: { status: { in: ["SUBMITTED", "PENDING_APPROVAL"] } } }),
    prisma.stockTransaction.findMany({ orderBy: { transactionDate: "desc" }, take: 10, include: { item: true, user: true, warehouse: true } }),
    prisma.stockReceipt.findMany({ orderBy: { receiptDate: "desc" }, take: 5, include: { supplier: true, warehouse: true } }),
    prisma.stockIssue.findMany({ orderBy: { issueDate: "desc" }, take: 5, include: { sourceWarehouse: true } }),
  ]);

  const items = await prisma.inventoryItem.findMany({ where: { deletedAt: null }, select: { id: true } });
  let totalStockValue = 0;
  for (const it of items) {
    const v = await computeStockValue(it.id);
    totalStockValue += v.value;
  }

  const statusCounts = await prisma.inventoryItem.groupBy({ by: ["status"], where: { deletedAt: null }, _count: true });

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
    charts: { inventoryByStatus: statusCounts.map((s) => ({ label: s.status, value: s._count })) },
    recentTransactions: recentTransactions.map((t) => ({
      id: t.id, code: t.code, item: t.item?.code ?? null, type: t.type,
      quantity: t.quantity, unitCost: t.unitCost, user: t.user?.fullName ?? null,
      warehouse: t.warehouse?.code ?? null, transactionDate: t.transactionDate.toISOString(),
    })),
    recentReceipts: recentReceipts.map((r) => ({
      id: r.id, code: r.code, supplier: r.supplier?.name ?? null, warehouse: r.warehouse?.code ?? null,
      totalAmount: r.totalAmount, totalQuantity: r.totalQuantity, receiptDate: r.receiptDate.toISOString(),
    })),
    recentIssues: recentIssues.map((i) => ({
      id: i.id, code: i.code, department: i.department, warehouse: i.sourceWarehouse?.code ?? null,
      totalQuantity: i.totalQuantity, totalCogs: i.totalCogs, issueDate: i.issueDate.toISOString(),
    })),
  };
}

async function storekeeperDashboard() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [todaysReceipts, todaysIssues, pendingRequisitions, readyForIssue, lowStockItems, recentTransactions, warehouseStock, recentApprovedRequisitions] = await Promise.all([
    prisma.stockReceipt.count({ where: { receiptDate: { gte: today } } }),
    prisma.stockIssue.count({ where: { issueDate: { gte: today } } }),
    prisma.requisition.count({ where: { status: { in: ["SUBMITTED", "PENDING_APPROVAL", "APPROVED"] } } }),
    prisma.requisition.count({ where: { status: "APPROVED" } }),
    prisma.inventoryItem.count({ where: { deletedAt: null, status: "LOW_STOCK" } }),
    prisma.stockTransaction.findMany({ orderBy: { transactionDate: "desc" }, take: 10, include: { item: true, user: true, warehouse: true } }),
    prisma.warehouseStock.findMany({ where: { quantity: { gt: 0 } }, include: { item: { include: { uom: true } }, warehouse: true }, orderBy: { updatedAt: "desc" }, take: 10 }),
    prisma.requisition.findMany({
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
      id: t.id, code: t.code, item: t.item?.code ?? null, type: t.type, quantity: t.quantity,
      user: t.user?.fullName ?? null, warehouse: t.warehouse?.code ?? null, transactionDate: t.transactionDate.toISOString(),
    })),
    warehouseStock: warehouseStock.map((ws) => ({
      id: ws.id, itemCode: ws.item.code, itemName: ws.item.name, uom: ws.item.uom.code,
      warehouse: ws.warehouse.code, quantity: ws.quantity, reservedQty: ws.reservedQty,
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
      latestApproval: r.approvals[0] ? {
        status: r.approvals[0].status,
        approver: r.approvals[0].approver.fullName,
        approvedAt: r.approvals[0].approvedAt.toISOString(),
      } : null,
      updatedAt: r.updatedAt.toISOString(),
    })),
  };
}

async function accountantDashboard() {
  const items = await prisma.inventoryItem.findMany({ where: { deletedAt: null }, select: { id: true } });
  let totalInventoryValue = 0;
  for (const it of items) {
    const v = await computeStockValue(it.id);
    totalInventoryValue += v.value;
  }
  return {
    role: "ACCOUNTANT",
    kpis: [
      { label: "Total Inventory Value", value: totalInventoryValue, icon: "DollarSign", format: "currency" },
      { label: "Total Items", value: items.length, icon: "Package" },
    ],
  };
}

async function departmentHeadDashboard(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const department = user?.department ?? null;
  const [myRequisitions, pendingApprovals, issuedItems, recentIssues] = await Promise.all([
    prisma.requisition.count({ where: { requestedById: userId } }),
    prisma.requisition.count({ where: { status: { in: ["SUBMITTED", "PENDING_APPROVAL"] } } }),
    prisma.stockIssue.count({ where: department ? { department } : {} }),
    prisma.stockIssue.findMany({
      where: department ? { department, status: "COMPLETED" } : { status: "COMPLETED" },
      orderBy: { issueDate: "desc" },
      take: 5,
      include: { sourceWarehouse: true, _count: { select: { items: true } } },
    }),
  ]);
  
  return {
    role: "DEPARTMENT_HEAD", department,
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
    prisma.gatePass.count({ where: { status: "PENDING" } }),
    prisma.gatePass.count({ where: { status: "APPROVED" } }),
    prisma.gatePass.count({ where: { status: "EXIT_CONFIRMED" } }),
  ]);
  return {
    role: "SECURITY_OFFICER",
    kpis: [
      { label: "Pending Gate Passes", value: pendingGatePasses, icon: "ShieldAlert", variant: "warning" },
      { label: "Approved Gate Passes", value: approvedGatePasses, icon: "ShieldCheck" },
      { label: "Material Exits", value: totalExits, icon: "LogOut" },
    ],
  };
}
