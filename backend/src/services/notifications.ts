import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { computeStockValue } from "./fifo";

export type Notification = {
  id: string;
  type: "low_stock" | "out_of_stock" | "pending_requisition" | "pending_gate_pass" | "pending_stocktake" | "failed_login" | "below_safety" | "info";
  title: string;
  message: string;
  severity: "info" | "warning" | "danger" | "success";
  link?: { section: string; itemId?: string; filter?: string };
  createdAt: string;
};

export async function getNotificationsForUser(userId: string, roles: Set<string>, permissions: Set<string>) {
  const items: Notification[] = [];

  const canSeeStockAlerts = roles.has("ADMINISTRATOR") || roles.has("PAO") || roles.has("STOREKEEPER") || permissions.has("inventory.read");
  if (canSeeStockAlerts) {
    const allItems = await prisma.inventoryItem.findMany({ where: { deletedAt: null }, include: { uom: true } });
    for (const item of allItems) {
      const val = await computeStockValue(item.id);
      if (val.quantity <= 0) {
        items.push({ id: `out_of_stock_${item.id}`, type: "out_of_stock", title: "Out of Stock", message: `${item.code} — ${item.name} has 0 units available`, severity: "danger", link: { section: "inventory", itemId: item.id }, createdAt: item.updatedAt.toISOString() });
      } else {
        if (val.quantity <= item.reorderLevel) {
          items.push({ id: `low_stock_${item.id}`, type: "low_stock", title: "Low Stock Alert", message: `${item.code} — ${item.name}: ${val.quantity} ${item.uom.code} left (reorder at ${item.reorderLevel})`, severity: "warning", link: { section: "inventory", itemId: item.id }, createdAt: item.updatedAt.toISOString() });
        }
        if (val.quantity <= item.safetyStock) {
          items.push({ id: `below_safety_${item.id}`, type: "below_safety", title: "Below Safety Stock", message: `${item.code} — ${item.name} is below safety stock (${val.quantity}/${item.safetyStock})`, severity: "danger", link: { section: "inventory", itemId: item.id }, createdAt: item.updatedAt.toISOString() });
        }
      }
    }
  }

  const canApproveRequisitions = roles.has("ADMINISTRATOR") || permissions.has("requisition.approve");
  if (canApproveRequisitions) {
    const requisitionWhere: Prisma.RequisitionWhereInput = {
      status: { in: ["SUBMITTED", "PENDING_APPROVAL"] },
    };

    // Department heads approve requests from their own department only.
    if (roles.has("DEPARTMENT_HEAD") && !roles.has("ADMINISTRATOR")) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { department: true } });
      if (user?.department) requisitionWhere.department = user.department;
      else requisitionWhere.requestedById = userId;
    }

    const pendingReqs = await prisma.requisition.count({ where: requisitionWhere });
    if (pendingReqs > 0) {
      items.push({ id: "pending_requisitions", type: "pending_requisition", title: "Pending Requisitions", message: `${pendingReqs} requisition${pendingReqs === 1 ? "" : "s"} awaiting approval`, severity: "warning", link: { section: "requisitions", filter: "pending" }, createdAt: new Date().toISOString() });
    }
  }

  const canApproveGatePasses = roles.has("ADMINISTRATOR") || permissions.has("gatepass.approve");
  if (canApproveGatePasses) {
    const pendingGatePasses = await prisma.gatePass.count({ where: { status: "PENDING" } });
    if (pendingGatePasses > 0) {
      items.push({ id: "pending_gate_passes", type: "pending_gate_pass", title: "Pending Gate Passes", message: `${pendingGatePasses} gate pass${pendingGatePasses === 1 ? "" : "es"} awaiting approval`, severity: "warning", link: { section: "audit-logs", filter: "gate-pass" }, createdAt: new Date().toISOString() });
    }
  }

  const canSeeStockTakes = roles.has("ADMINISTRATOR") || permissions.has("stocktake.read");
  if (canSeeStockTakes) {
    const pendingStockTakes = await prisma.stockTake.count({ where: { status: { in: ["DRAFT", "IN_PROGRESS"] } } });
    if (pendingStockTakes > 0) {
      items.push({ id: "pending_stocktakes", type: "pending_stocktake", title: "Active Stock Takes", message: `${pendingStockTakes} stock take${pendingStockTakes === 1 ? "" : "s"} in progress`, severity: "info", link: { section: "audit-logs", filter: "stock-take" }, createdAt: new Date().toISOString() });
    }
  }

  const canSeeAudit = roles.has("ADMINISTRATOR") || permissions.has("audit.view");
  if (canSeeAudit) {
    const since = new Date(); since.setHours(since.getHours() - 24);
    const failedLogins = await prisma.auditLog.count({ where: { action: "LOGIN_FAILED", timestamp: { gte: since } } });
    if (failedLogins > 0) {
      items.push({ id: "failed_logins_24h", type: "failed_login", title: "Failed Login Attempts", message: `${failedLogins} failed login attempt${failedLogins === 1 ? "" : "s"} in the last 24 hours`, severity: failedLogins >= 5 ? "danger" : "warning", link: { section: "audit-logs", filter: "failed-login" }, createdAt: new Date().toISOString() });
    }
  }

  const severityOrder = { danger: 0, warning: 1, info: 2, success: 3 };
  items.sort((a, b) => {
    const sv = severityOrder[a.severity] - severityOrder[b.severity];
    if (sv !== 0) return sv;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return { items: items.slice(0, 20), unreadCount: items.filter((i) => i.severity === "danger" || i.severity === "warning").length };
}
