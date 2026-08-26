import { Router, Response } from "express";
import { ok, paginate } from "../utils/response";
import { asyncHandler, actorOf, requirePermission, AuthedRequest } from "../middleware/auth";
import { qp, qpPage, qpLimit } from "../utils/query";
import { recordAudit } from "../services/audit";
import * as svc from "../services/reports";
import * as csv from "../services/export";

const router = Router();

router.get("/inventory", requirePermission("reports.view"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const params = {
    categoryId: qp(req, "categoryId"), storeId: qp(req, "storeId"),
    status: qp(req, "status"), lowStockOnly: qp(req, "lowStockOnly") === "true",
  };
  const result = await svc.inventoryReport(params);
  res.json(ok(result));
}));

router.get("/valuation", requirePermission("reports.view"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const params = { categoryId: qp(req, "categoryId"), storeId: qp(req, "storeId") };
  const result = await svc.valuationReport(params);
  res.json(ok(result));
}));

router.get("/movement", requirePermission("reports.view"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const params = {
    startDate: qp(req, "startDate"), endDate: qp(req, "endDate"),
    storeId: qp(req, "storeId"), itemId: qp(req, "itemId"),
    type: qp(req, "type"), userId: qp(req, "userId"),
    page: qpPage(req), limit: qpLimit(req, 50),
  };
  const result = await svc.movementReport(params);
  res.json(ok(paginate(result.items, result.total, params.page, params.limit)));
}));

router.get("/audit", requirePermission("audit.view"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const params = {
    startDate: qp(req, "startDate"), endDate: qp(req, "endDate"),
    userId: qp(req, "userId"), module: qp(req, "module"), action: qp(req, "action"),
    page: qpPage(req), limit: qpLimit(req, 50),
  };
  const result = await svc.auditReport(params);
  res.json(ok(paginate(result.items, result.total, params.page, params.limit)));
}));

/* ── CSV export ──────────────────────────────────────────────────────────
 * reports.export was granted to Admin, PAO and Accountant long before any
 * endpoint honoured it. Each export reuses the report service above verbatim, so
 * a CSV can never disagree with the screen it was taken from.
 *
 * The audit export keeps its own audit.view requirement on top of reports.export.
 */

function sendCsv(res: Response, result: csv.ExportResult) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
  // Truncation is stated rather than hidden: a partial file that looks whole is a
  // worse failure than a missing one. The client reads these to warn the user.
  res.setHeader("X-Export-Rows", String(result.rows));
  res.setHeader("X-Export-Total", String(result.total));
  res.setHeader("X-Export-Truncated", result.rows < result.total ? "true" : "false");
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition, X-Export-Rows, X-Export-Total, X-Export-Truncated");
  res.send(result.csv);
}

router.get("/inventory/export", requirePermission("reports.export"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const result = await csv.exportInventory({
    categoryId: qp(req, "categoryId"), storeId: qp(req, "storeId"),
    status: qp(req, "status"), lowStockOnly: qp(req, "lowStockOnly") === "true",
  });
  await recordAudit({
    ctx: actorOf(req), action: "REPORT_EXPORTED", module: "reports", entity: "inventoryReport",
    newValue: { rows: result.rows, total: result.total },
    description: `Exported inventory report (${result.rows} row(s))`,
  });
  sendCsv(res, result);
}));

router.get("/valuation/export", requirePermission("reports.export"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const result = await csv.exportValuation({
    categoryId: qp(req, "categoryId"), storeId: qp(req, "storeId"),
  });
  await recordAudit({
    ctx: actorOf(req), action: "REPORT_EXPORTED", module: "reports", entity: "valuationReport",
    newValue: { rows: result.rows, total: result.total },
    description: `Exported stock valuation report (${result.rows} row(s))`,
  });
  sendCsv(res, result);
}));

router.get("/movement/export", requirePermission("reports.export"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const result = await csv.exportMovement({
    startDate: qp(req, "startDate"), endDate: qp(req, "endDate"),
    storeId: qp(req, "storeId"), itemId: qp(req, "itemId"),
    type: qp(req, "type"), userId: qp(req, "userId"),
  });
  await recordAudit({
    ctx: actorOf(req), action: "REPORT_EXPORTED", module: "reports", entity: "movementReport",
    newValue: { rows: result.rows, total: result.total, truncated: result.rows < result.total },
    description: `Exported stock movement report (${result.rows} of ${result.total} row(s))`,
  });
  sendCsv(res, result);
}));

router.get("/audit/export", requirePermission("reports.export", "audit.view"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const result = await csv.exportAudit({
    startDate: qp(req, "startDate"), endDate: qp(req, "endDate"),
    userId: qp(req, "userId"), module: qp(req, "module"), action: qp(req, "action"),
  });
  await recordAudit({
    ctx: actorOf(req), action: "REPORT_EXPORTED", module: "reports", entity: "auditReport",
    newValue: { rows: result.rows, total: result.total, truncated: result.rows < result.total },
    description: `Exported audit report (${result.rows} of ${result.total} row(s))`,
  });
  sendCsv(res, result);
}));

export default router;
