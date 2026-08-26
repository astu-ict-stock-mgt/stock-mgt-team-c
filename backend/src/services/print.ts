import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { getReceipt } from "./receipts";
import { getIssue } from "./issues";

/**
 * Printable documents: the GRN, the issue voucher and the requisition form.
 *
 * Returns a self-contained HTML page rather than a PDF. Server-side PDF would mean
 * bundling Chromium (~300MB) into backend/node_modules plus system libs on every
 * developer machine and CI runner; the browser's own Print dialog already renders
 * these to paper or to PDF, which is what the SRS actually asks for. The @media
 * print rules below are what make that output correct.
 */

const ORG = "Adama Science and Technology University";
const ORG_SHORT = "ASTU";

function esc(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function qty(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

function date(value: string | Date | null | undefined, withTime = false): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  const day = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  if (!withTime) return day;
  return `${day} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;
}

/** Label/value pairs in the document head block. */
function fields(pairs: Array<[string, string]>): string {
  return `<dl class="fields">${pairs
    .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v || "—"}</dd></div>`)
    .join("")}</dl>`;
}

function signatures(roles: string[]): string {
  return `<div class="sigs">${roles
    .map((r) => `<div class="sig"><span class="line"></span><span class="who">${esc(r)}</span></div>`)
    .join("")}</div>`;
}

function layout(opts: {
  title: string; docType: string; docNo: string; body: string;
}): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.docType)} ${esc(opts.docNo)}</title>
<style>
  :root { --ink:#111; --muted:#555; --rule:#c8c8c8; --band:#f2f2f2; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0; padding: 24px;
    font: 12px/1.45 "Helvetica Neue", Arial, sans-serif;
    color: var(--ink); background: #fff;
  }
  .sheet { max-width: 760px; margin: 0 auto; }

  header { display: flex; align-items: flex-start; gap: 14px;
           border-bottom: 2px solid var(--ink); padding-bottom: 10px; }
  .crest { width: 46px; height: 46px; flex: 0 0 46px; border: 1px solid var(--rule);
           border-radius: 5px; display: flex; align-items: center; justify-content: center;
           font-weight: 700; font-size: 13px; letter-spacing: .5px; }
  .org { flex: 1; }
  .org h1 { margin: 0; font-size: 15px; letter-spacing: .2px; }
  .org p  { margin: 1px 0 0; font-size: 10.5px; color: var(--muted); }
  .doc { text-align: right; }
  .doc .type { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
  .doc .no   { font-size: 12px; font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; }

  h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .8px;
       color: var(--muted); margin: 18px 0 6px; }

  .fields { display: grid; grid-template-columns: repeat(2, minmax(0,1fr));
            gap: 6px 22px; margin: 12px 0 0; }
  .fields dt { font-size: 9.5px; text-transform: uppercase; letter-spacing: .6px; color: var(--muted); }
  .fields dd { margin: 1px 0 0; font-size: 12px; font-weight: 500; }

  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { padding: 5px 7px; border-bottom: 1px solid var(--rule); text-align: left;
           vertical-align: top; }
  thead th { background: var(--band); font-size: 9.5px; text-transform: uppercase;
             letter-spacing: .5px; border-bottom: 1px solid var(--ink); }
  td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; }
  tfoot td { font-weight: 700; border-top: 1px solid var(--ink); border-bottom: none; }
  .mono { font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; font-size: 11px; }

  .note { margin-top: 12px; padding: 8px 10px; background: var(--band);
          border-left: 3px solid var(--rule); font-size: 11px; white-space: pre-wrap; }
  .pill { display: inline-block; padding: 1px 7px; border: 1px solid var(--rule);
          border-radius: 9px; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; }

  .sigs { display: flex; gap: 26px; margin-top: 34px; }
  .sig { flex: 1; }
  .sig .line { display: block; border-top: 1px solid var(--ink); margin-bottom: 4px; }
  .sig .who  { font-size: 9.5px; text-transform: uppercase; letter-spacing: .6px; color: var(--muted); }

  footer { margin-top: 22px; border-top: 1px solid var(--rule); padding-top: 6px;
           font-size: 9.5px; color: var(--muted); display: flex; justify-content: space-between; }

  .toolbar { max-width: 760px; margin: 0 auto 14px; text-align: right; }
  .toolbar button { font: inherit; padding: 6px 14px; cursor: pointer;
                    border: 1px solid var(--ink); background: var(--ink); color: #fff; border-radius: 4px; }

  @media print {
    body { padding: 0; }
    .toolbar { display: none; }
    /* Keep a long item list from splitting a row across pages, and repeat the
       header on every sheet so page 2 is still readable on its own. */
    thead { display: table-header-group; }
    tr, .sigs { break-inside: avoid; }
    @page { margin: 14mm; }
  }
</style>
</head>
<body>
<div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div>
<div class="sheet">
  <header>
    <div class="crest">${ORG_SHORT}</div>
    <div class="org">
      <h1>${ORG}</h1>
      <p>Property Administration Office — Stock Management System</p>
    </div>
    <div class="doc">
      <div class="type">${esc(opts.docType)}</div>
      <div class="no">${esc(opts.docNo)}</div>
    </div>
  </header>
  ${opts.body}
  <footer>
    <span>${esc(opts.docType)} ${esc(opts.docNo)}</span>
    <span>Printed ${esc(date(new Date(), true))}</span>
  </footer>
</div>
</body>
</html>`;
}

/** Goods Receiving Note. */
export async function printReceipt(id: string): Promise<string> {
  const r = await getReceipt(id);

  const rows = r.items.map((it, i) => `<tr>
    <td class="n">${i + 1}</td>
    <td class="mono">${esc(it.itemCode)}</td>
    <td>${esc(it.itemName)}</td>
    <td>${esc(it.uom)}</td>
    <td class="n">${qty(it.quantity)}</td>
    <td class="n">${money(it.unitCost)}</td>
    <td class="n">${money(it.total)}</td>
    <td>${it.inspected ? (it.inspectionPassed ? "Passed" : "Failed") : "Pending"}</td>
  </tr>`).join("");

  const body = `
  ${fields([
    ["GRN Number", `<span class="mono">${esc(r.code)}</span>`],
    ["Receipt Date", esc(date(r.receiptDate))],
    ["Supplier", `${esc(r.supplier.name)} <span class="mono">(${esc(r.supplier.code)})</span>`],
    ["Store", `${esc(r.store.name)} <span class="mono">(${esc(r.store.code)})</span>`],
    ["Received By", esc(r.receivedBy.fullName)],
    ["Status", `<span class="pill">${esc(r.status)}</span>`],
  ])}

  <h2>Goods Received</h2>
  <table>
    <thead><tr>
      <th class="n">#</th><th>Item Code</th><th>Description</th><th>Unit</th>
      <th class="n">Quantity</th><th class="n">Unit Cost</th><th class="n">Amount</th><th>Inspection</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>
      <td colspan="4">Total</td>
      <td class="n">${qty(r.totalQuantity)}</td>
      <td class="n"></td>
      <td class="n">ETB ${money(r.totalAmount)}</td>
      <td></td>
    </tr></tfoot>
  </table>

  ${r.inspectionNotes ? `<div class="note"><strong>Inspection notes:</strong> ${esc(r.inspectionNotes)}</div>` : ""}
  ${signatures(["Received By (Storekeeper)", "Inspected By", "Approved By (PAO)"])}`;

  return layout({ title: "GRN", docType: "Goods Receiving Note", docNo: r.code, body });
}

/** Stores Issue Voucher. */
export async function printIssue(id: string): Promise<string> {
  const i = await getIssue(id);

  const rows = i.items.map((it, n) => `<tr>
    <td class="n">${n + 1}</td>
    <td class="mono">${esc(it.itemCode)}</td>
    <td>${esc(it.itemName)}</td>
    <td>${esc(it.uom)}</td>
    <td class="n">${qty(it.quantity)}</td>
    <td class="n">${money(it.unitCost)}</td>
    <td class="n">${money(it.cogs)}</td>
    <td>${esc(it.remarks ?? "")}</td>
  </tr>`).join("");

  const body = `
  ${fields([
    ["Voucher Number", `<span class="mono">${esc(i.code)}</span>`],
    ["Issue Date", esc(date(i.issueDate))],
    ["Issued From", `${esc(i.sourceStore.name)} <span class="mono">(${esc(i.sourceStore.code)})</span>`],
    ["Issued To", esc(i.destStore ? `${i.destStore.name} (${i.destStore.code})` : i.department)],
    ["Department", esc(i.department)],
    ["Issued By", esc(i.issuedBy.fullName)],
    ["Status", `<span class="pill">${esc(i.status)}</span>`],
    ["Gate Pass", i.gatePass ? `<span class="mono">${esc(i.gatePass.code)}</span> (${esc(i.gatePass.status)})` : "Not requested"],
  ])}

  <h2>Items Issued</h2>
  <table>
    <thead><tr>
      <th class="n">#</th><th>Item Code</th><th>Description</th><th>Unit</th>
      <th class="n">Quantity</th><th class="n">Unit Cost</th><th class="n">Value</th><th>Remarks</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>
      <td colspan="4">Total</td>
      <td class="n">${qty(i.totalQuantity)}</td>
      <td class="n"></td>
      <td class="n">ETB ${money(i.totalCogs)}</td>
      <td></td>
    </tr></tfoot>
  </table>

  ${i.notes ? `<div class="note"><strong>Notes:</strong> ${esc(i.notes)}</div>` : ""}
  ${signatures(["Issued By (Storekeeper)", "Received By", "Authorised By"])}`;

  return layout({ title: "Issue Voucher", docType: "Stores Issue Voucher", docNo: i.code, body });
}

/**
 * Requisition form. Queried directly rather than through the route's
 * serializeRequisition, which is private to routes/requisitions.ts and takes only
 * the single latest approval — a printed form has to show the full approval trail.
 */
export async function printRequisition(id: string): Promise<string> {
  const r = await prisma.requisition.findUnique({
    where: { id },
    include: {
      requestedBy: { select: { fullName: true, email: true, department: true } },
      items: { include: { item: { include: { uom: { select: { code: true } } } } } },
      approvals: {
        include: { approver: { select: { fullName: true } } },
        orderBy: { approvedAt: "asc" },
      },
    },
  });
  if (!r) throw Errors.notFound("Requisition", id);

  const rows = r.items.map((it, n) => `<tr>
    <td class="n">${n + 1}</td>
    <td class="mono">${esc(it.item.code)}</td>
    <td>${esc(it.item.name)}</td>
    <td>${esc(it.item.uom.code)}</td>
    <td class="n">${qty(it.quantity)}</td>
    <td class="n">${qty(it.fulfilledQty)}</td>
    <td class="n">${qty(Math.max(0, it.quantity - it.fulfilledQty))}</td>
  </tr>`).join("");

  const approvals = r.approvals.length
    ? `<h2>Approval Trail</h2>
       <table>
         <thead><tr><th>Approver</th><th>Decision</th><th>Date</th><th>Comments</th></tr></thead>
         <tbody>${r.approvals.map((a) => `<tr>
           <td>${esc(a.approver.fullName)}</td>
           <td><span class="pill">${esc(a.status)}</span></td>
           <td>${esc(date(a.approvedAt, true))}</td>
           <td>${esc(a.comments ?? "")}</td>
         </tr>`).join("")}</tbody>
       </table>`
    : `<h2>Approval Trail</h2><div class="note">No approvals recorded yet.</div>`;

  const body = `
  ${fields([
    ["Requisition Number", `<span class="mono">${esc(r.code)}</span>`],
    ["Raised On", esc(date(r.createdAt))],
    ["Requested By", esc(r.requestedBy.fullName)],
    ["Department", esc(r.department)],
    ["Required By", esc(date(r.requiredDate))],
    ["Status", `<span class="pill">${esc(r.status)}</span>`],
  ])}

  <h2>Items Requested</h2>
  <table>
    <thead><tr>
      <th class="n">#</th><th>Item Code</th><th>Description</th><th>Unit</th>
      <th class="n">Requested</th><th class="n">Fulfilled</th><th class="n">Outstanding</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>
      <td colspan="4">Total</td>
      <td class="n">${qty(r.items.reduce((t, i) => t + i.quantity, 0))}</td>
      <td class="n">${qty(r.items.reduce((t, i) => t + i.fulfilledQty, 0))}</td>
      <td class="n">${qty(r.items.reduce((t, i) => t + Math.max(0, i.quantity - i.fulfilledQty), 0))}</td>
    </tr></tfoot>
  </table>

  ${approvals}
  ${r.notes ? `<div class="note"><strong>Notes:</strong> ${esc(r.notes)}</div>` : ""}
  ${signatures(["Requested By", "Head of Department", "Approved By (PAO)"])}`;

  return layout({ title: "Requisition", docType: "Stores Requisition", docNo: r.code, body });
}
