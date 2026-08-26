import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { recordAudit, AuditContext } from "./audit";
import { nextDocumentCode, withUniqueRetry } from "../utils/document-code";

/**
 * Gate passes — authorisation for materials to leave the campus.
 *
 * PENDING ──approve──▶ APPROVED ──confirm exit──▶ EXIT_CONFIRMED
 *    │                    │
 *    ├──reject──▶ REJECTED│
 *    └────── cancel ──────┴──▶ CANCELLED
 *
 * This is the Security Officer's whole job: securityOfficerDashboard() in
 * services/dashboard.ts renders three gate-pass KPIs and nothing else.
 *
 * No stock moves here. The stock issue already removed the goods from the store;
 * the gate pass is the control document proving the movement off site was
 * authorised and actually happened.
 */

const DETAIL_INCLUDE = {
  requestedBy: { select: { id: true, fullName: true, department: true } },
  securityOfficer: { select: { id: true, fullName: true } },
  issue: {
    select: {
      id: true, code: true, department: true, totalQuantity: true,
      issueDate: true, sourceStore: { select: { id: true, code: true, name: true } },
    },
  },
} satisfies Prisma.GatePassInclude;

type GatePassDetail = Prisma.GatePassGetPayload<{ include: typeof DETAIL_INCLUDE }>;

function serialize(g: GatePassDetail) {
  return {
    id: g.id,
    code: g.code,
    status: g.status,
    requestedBy: g.requestedBy,
    securityOfficer: g.securityOfficer,
    issue: g.issue
      ? {
        id: g.issue.id, code: g.issue.code, department: g.issue.department,
        totalQuantity: g.issue.totalQuantity, issueDate: g.issue.issueDate.toISOString(),
        sourceStore: g.issue.sourceStore,
      }
      : null,
    carrier: g.carrier,
    vehiclePlate: g.vehiclePlate,
    exitConfirmedAt: g.exitConfirmedAt?.toISOString() ?? null,
    notes: g.notes,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}

export async function listGatePasses(params: {
  page: number; limit: number; search?: string; status?: string; requestedById?: string;
}) {
  const where: Prisma.GatePassWhereInput = {};
  if (params.status) where.status = params.status as any;
  if (params.requestedById) where.requestedById = params.requestedById;
  if (params.search) {
    where.OR = [
      { code: { contains: params.search } },
      { carrier: { contains: params.search } },
      { vehiclePlate: { contains: params.search } },
      { issue: { code: { contains: params.search } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.gatePass.count({ where }),
    prisma.gatePass.findMany({
      where, orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit, take: params.limit,
      include: DETAIL_INCLUDE,
    }),
  ]);

  return { total, items: rows.map(serialize) };
}

export async function getGatePass(id: string) {
  const g = await prisma.gatePass.findUnique({ where: { id }, include: DETAIL_INCLUDE });
  if (!g) throw Errors.notFound("Gate pass", id);
  return serialize(g);
}

export async function requestGatePass(
  input: {
    issueId?: string | null; carrier?: string; vehiclePlate?: string;
    notes?: string; requestedById: string;
  },
  auditCtx?: AuditContext
) {
  if (input.issueId) {
    const issue = await prisma.stockIssue.findUnique({
      where: { id: input.issueId },
      select: { id: true, code: true, status: true, gatePass: { select: { code: true } } },
    });
    if (!issue) throw Errors.notFound("Stock issue", input.issueId);
    // GatePass.issueId is @unique, so a second pass for one issue would fail on
    // the index anyway — catching it here gives a message that says why.
    if (issue.gatePass) {
      throw Errors.conflict(`Issue ${issue.code} already has gate pass ${issue.gatePass.code}`);
    }
    if (issue.status === "CANCELLED") {
      throw Errors.invalidGatePass(`Issue ${issue.code} was cancelled — it cannot leave the campus`);
    }
  }

  const created = await withUniqueRetry(() => prisma.$transaction(async (tx) => {
    const code = await nextDocumentCode("GP", (startsWith) =>
      tx.gatePass.count({ where: { code: { startsWith } } })
    );
    return tx.gatePass.create({
      data: {
        code,
        issueId: input.issueId ?? null,
        requestedById: input.requestedById,
        status: "PENDING",
        carrier: input.carrier ?? null,
        vehiclePlate: input.vehiclePlate ?? null,
        notes: input.notes ?? null,
      },
    });
  }));

  await recordAudit({
    ctx: auditCtx,
    action: "GATEPASS_REQUESTED", module: "gate-passes", entity: "gatePass", entityId: created.id,
    newValue: {
      code: created.code, issueId: input.issueId ?? null,
      carrier: input.carrier ?? null, vehiclePlate: input.vehiclePlate ?? null,
    },
    description: `Requested gate pass ${created.code}`,
  });

  return getGatePass(created.id);
}

/**
 * Security approves or rejects. The requester may never be the approver — unlike
 * dispositions, the permission model already separates these duties cleanly
 * (STOREKEEPER holds gatepass.request and not .approve; SECURITY_OFFICER the
 * reverse), so enforcing it locks nobody out.
 */
export async function decideGatePass(
  id: string,
  input: { decision: "APPROVED" | "REJECTED"; notes?: string },
  securityOfficerId: string,
  auditCtx?: AuditContext
) {
  const g = await prisma.gatePass.findUnique({ where: { id } });
  if (!g) throw Errors.notFound("Gate pass", id);
  if (g.status !== "PENDING") {
    throw Errors.invalidGatePass(
      `Gate pass ${g.code} is already ${g.status.toLowerCase().replace("_", " ")}`
    );
  }
  if (g.requestedById === securityOfficerId) {
    throw Errors.forbidden("You cannot approve a gate pass you requested yourself");
  }

  await prisma.gatePass.update({
    where: { id },
    data: {
      status: input.decision,
      securityOfficerId,
      // Security's reason is appended rather than replacing the requester's note.
      notes: input.notes ? [g.notes, input.notes].filter(Boolean).join(" | ") : g.notes,
    },
  });

  await recordAudit({
    ctx: auditCtx,
    action: input.decision === "APPROVED" ? "GATEPASS_APPROVED" : "GATEPASS_REJECTED",
    module: "gate-passes", entity: "gatePass", entityId: id,
    oldValue: { status: "PENDING" },
    newValue: { status: input.decision, securityOfficerId, comments: input.notes ?? null },
    description: `${input.decision === "APPROVED" ? "Approved" : "Rejected"} gate pass ${g.code}`,
  });

  return getGatePass(id);
}

/** The goods physically left. Only an approved pass can be exited. */
export async function confirmGatePassExit(
  id: string, securityOfficerId: string, auditCtx?: AuditContext
) {
  const g = await prisma.gatePass.findUnique({ where: { id } });
  if (!g) throw Errors.notFound("Gate pass", id);
  if (g.status !== "APPROVED") {
    throw Errors.invalidGatePass(
      g.status === "EXIT_CONFIRMED"
        ? `Exit for ${g.code} was already confirmed`
        : `Gate pass ${g.code} is ${g.status.toLowerCase()} — only an approved pass can be exited`
    );
  }

  const exitConfirmedAt = new Date();
  await prisma.gatePass.update({
    where: { id },
    data: { status: "EXIT_CONFIRMED", exitConfirmedAt, securityOfficerId },
  });

  await recordAudit({
    ctx: auditCtx,
    action: "GATEPASS_EXIT_CONFIRMED", module: "gate-passes", entity: "gatePass", entityId: id,
    oldValue: { status: "APPROVED" },
    newValue: { status: "EXIT_CONFIRMED", exitConfirmedAt: exitConfirmedAt.toISOString(), securityOfficerId },
    description: `Confirmed material exit for gate pass ${g.code}`,
  });

  return getGatePass(id);
}

/** The requester (or an admin) withdraws a pass that has not been used yet. */
export async function cancelGatePass(
  id: string, userId: string, isAdmin: boolean, auditCtx?: AuditContext
) {
  const g = await prisma.gatePass.findUnique({ where: { id } });
  if (!g) throw Errors.notFound("Gate pass", id);
  if (g.requestedById !== userId && !isAdmin) {
    throw Errors.forbidden("You can only cancel a gate pass you requested");
  }
  if (!["PENDING", "APPROVED"].includes(g.status)) {
    throw Errors.invalidGatePass(
      g.status === "EXIT_CONFIRMED"
        ? `The goods on ${g.code} have already left — it cannot be cancelled`
        : `Gate pass ${g.code} is already ${g.status.toLowerCase()}`
    );
  }

  await prisma.gatePass.update({ where: { id }, data: { status: "CANCELLED" } });

  await recordAudit({
    ctx: auditCtx,
    action: "GATEPASS_CANCELLED", module: "gate-passes", entity: "gatePass", entityId: id,
    oldValue: { status: g.status }, newValue: { status: "CANCELLED" },
    description: `Cancelled gate pass ${g.code}`,
  });

  return getGatePass(id);
}
