/**
 * CSV export for the existing reports.
 *
 * Deliberately no dependency: RFC 4180 is a handful of rules and the report
 * services already produce exactly the rows we need, so this only reshapes them.
 */

import * as reports from "./reports";

/**
 * Hard ceiling on exported rows. Movement and audit are unbounded histories, and
 * streaming a million rows through a JSON service layer would exhaust memory.
 * The caller is told when this bites (see routes/reports.ts) — a truncated export
 * that silently looks complete is worse than no export.
 */
export const EXPORT_MAX_ROWS = 5000;

type Cell = string | number | boolean | null | undefined;

// A leading =, +, - or @ makes a spreadsheet treat text as a formula, which turns
// a shared export into a script-execution vector. Numbers are left alone so a
// negative quantity still reads as a number.
function neutralize(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function cell(value: Cell): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "Yes" : "No";

  const text = neutralize(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: Cell[][]): string {
  const lines = [headers.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))];
  // CRLF per RFC 4180, and a BOM so Excel reads UTF-8 (Amharic item names) right.
  return `﻿${lines.join("\r\n")}\r\n`;
}

export type ExportResult = { csv: string; filename: string; rows: number; total: number };

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function build(name: string, headers: string[], rows: Cell[][], total = rows.length): ExportResult {
  const truncated = rows.length < total;
  return {
    csv: toCsv(headers, rows),
    filename: `${name}-${stamp()}${truncated ? "-partial" : ""}.csv`,
    rows: rows.length,
    total,
  };
}

export async function exportInventory(params: {
  categoryId?: string; storeId?: string; status?: string; lowStockOnly?: boolean;
}): Promise<ExportResult> {
  const report = await reports.inventoryReport(params);
  return build(
    "inventory-report",
    ["Code", "Name", "Category", "Unit", "Status", "Quantity", "Unit Cost (ETB)",
      "Total Value (ETB)", "Min Stock", "Max Stock", "Reorder Level", "Safety Stock",
      "Low Stock", "Out of Stock"],
    report.items.map((i) => [
      i.code, i.name, i.category, i.uom, i.status, i.quantity, i.unitCost, i.totalValue,
      i.minStock, i.maxStock, i.reorderLevel, i.safetyStock, i.isLowStock, i.isOutOfStock,
    ])
  );
}

export async function exportValuation(params: {
  categoryId?: string; storeId?: string;
}): Promise<ExportResult> {
  const report = await reports.valuationReport(params);
  return build(
    "valuation-report",
    ["Code", "Name", "Category", "Unit", "Quantity", "Avg Unit Cost (ETB)",
      "Total Value (ETB)", "FIFO Layers"],
    report.items.map((i) => [
      i.code, i.name, i.category, i.uom, i.quantity, i.avgUnitCost, i.totalValue, i.fifoLayers,
    ])
  );
}

export async function exportMovement(params: {
  startDate?: string; endDate?: string; storeId?: string; itemId?: string;
  type?: string; userId?: string;
}): Promise<ExportResult> {
  const report = await reports.movementReport({ ...params, page: 1, limit: EXPORT_MAX_ROWS });
  return build(
    "stock-movement-report",
    ["Transaction", "Date", "Type", "Item Code", "Item Name", "Unit", "Quantity",
      "Unit Cost (ETB)", "Balance Before", "Balance After", "Reference Type",
      "Reference", "User", "Store", "Remarks"],
    report.items.map((t) => [
      t.code, t.transactionDate, t.type, t.itemCode, t.itemName, t.uom, t.quantity,
      t.unitCost, t.balanceBefore, t.balanceAfter, t.referenceType, t.referenceId,
      t.user, t.store, t.remarks,
    ]),
    report.total
  );
}

export async function exportAudit(params: {
  startDate?: string; endDate?: string; userId?: string; module?: string; action?: string;
}): Promise<ExportResult> {
  const report = await reports.auditReport({ ...params, page: 1, limit: EXPORT_MAX_ROWS });
  return build(
    "audit-report",
    ["Timestamp", "Action", "Module", "Entity", "Entity ID", "User", "Email",
      "IP Address", "Description"],
    report.items.map((a) => [
      a.timestamp, a.action, a.module, a.entity, a.entityId,
      a.user?.fullName ?? null, a.user?.email ?? null, a.ipAddress, a.description,
    ]),
    report.total
  );
}
