import { Router, Response } from "express";
import { asyncHandler, actorOf, requirePermission, AuthedRequest } from "../middleware/auth";
import { recordAudit } from "../services/audit";
import * as svc from "../services/print";

/**
 * Print-ready HTML for the three documents the SRS names: the GRN, the issue
 * voucher and the requisition form. The browser turns these into paper or PDF.
 *
 * These are documents, not data, so they respond as text/html rather than the
 * usual ok()/fail() JSON envelope. Errors still go through the shared handler and
 * come back as JSON, which the frontend already understands.
 */
const router = Router();

function send(res: Response, html: string) {
  res.type("html").send(html);
}

router.get("/receipts/:id", requirePermission("reports.export"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const html = await svc.printReceipt(req.params.id);
  await recordAudit({
    ctx: actorOf(req), action: "DOCUMENT_PRINTED", module: "print",
    entity: "receipt", entityId: req.params.id,
    description: "Printed goods receiving note",
  });
  send(res, html);
}));

router.get("/issues/:id", requirePermission("reports.export"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const html = await svc.printIssue(req.params.id);
  await recordAudit({
    ctx: actorOf(req), action: "DOCUMENT_PRINTED", module: "print",
    entity: "issue", entityId: req.params.id,
    description: "Printed stores issue voucher",
  });
  send(res, html);
}));

router.get("/requisitions/:id", requirePermission("reports.export"), asyncHandler(async (req: AuthedRequest, res: Response) => {
  const html = await svc.printRequisition(req.params.id);
  await recordAudit({
    ctx: actorOf(req), action: "DOCUMENT_PRINTED", module: "print",
    entity: "requisition", entityId: req.params.id,
    description: "Printed requisition form",
  });
  send(res, html);
}));

export default router;
