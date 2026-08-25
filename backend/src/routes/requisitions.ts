import { Prisma, RequisitionStatus } from "@prisma/client";
import { Router, Response } from "express";
import { prisma } from "../config/db";
import { ok, paginate } from "../utils/response";
import { asyncHandler, requirePermission, AuthedRequest } from "../middleware/auth";
import { qp, qpPage, qpLimit } from "../utils/query";
import * as val from "../validators";
import { recordAudit } from "../services/audit";
import { Errors } from "../utils/errors";
import { nextDocumentCode, withUniqueRetry } from "../utils/document-code";
import { ROLES } from "../constants/roles";

const router = Router();

// Every endpoint returned the same shape via a copy-pasted include + mapping
// block. Declared once so the list, detail and mutation responses cannot drift.
const REQUISITION_INCLUDE = {
  requestedBy: { select: { id: true, fullName: true, email: true, department: true } },
  _count: { select: { items: true, approvals: true } },
  items: { include: { item: { select: { id: true, code: true, name: true } } } },
  approvals: {
    include: { approver: { select: { id: true, fullName: true, email: true } } },
    orderBy: { approvedAt: "desc" },
    take: 1,
  },
} satisfies Prisma.RequisitionInclude;

type RequisitionWithRelations = Prisma.RequisitionGetPayload<{ include: typeof REQUISITION_INCLUDE }>;

function serializeRequisition(requisition: RequisitionWithRelations) {
  const latest = requisition.approvals[0];
  return {
    id: requisition.id,
    code: requisition.code,
    requestedBy: requisition.requestedBy,
    department: requisition.department,
    status: requisition.status,
    requiredDate: requisition.requiredDate.toISOString(),
    notes: requisition.notes,
    createdAt: requisition.createdAt.toISOString(),
    updatedAt: requisition.updatedAt.toISOString(),
    itemCount: requisition._count.items,
    approvalCount: requisition._count.approvals,
    items: requisition.items.map((item) => ({
      id: item.id,
      itemId: item.itemId,
      itemCode: item.item.code,
      itemName: item.item.name,
      quantity: item.quantity,
      fulfilledQty: item.fulfilledQty,
      remainingQty: Math.max(0, item.quantity - item.fulfilledQty),
    })),
    latestApproval: latest
      ? {
        id: latest.id,
        status: latest.status,
        approver: latest.approver,
        approvedAt: latest.approvedAt.toISOString(),
        comments: latest.comments,
      }
      : null,
  };
}

const ALLOWED_STATUSES: RequisitionStatus[] = [
  "DRAFT", "SUBMITTED", "PENDING_APPROVAL", "APPROVED",
  "REJECTED", "PARTIALLY_FULFILLED", "FULFILLED", "CANCELLED",
];

// Number of approvals required before a requisition becomes APPROVED.
// Was an unexplained `>= 2` inline; named here so the rule is visible and the
// team can change it in one place.
export const REQUIRED_APPROVALS = 2;

router.get(
  "/",
  requirePermission("requisition.read"),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const page = qpPage(req);
    const limit = qpLimit(req, 15);
    const search = qp(req, "search");
    const status = qp(req, "status");
    const department = qp(req, "department");

    const where: Prisma.RequisitionWhereInput = {};
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { department: { contains: search } },
        { notes: { contains: search } },
      ];
    }
    if (status === "PENDING") where.status = { in: ["SUBMITTED", "PENDING_APPROVAL"] };
    else if (status && ALLOWED_STATUSES.includes(status as RequisitionStatus)) where.status = status as RequisitionStatus;
    if (department) where.department = department;

    const [total, rows] = await Promise.all([
      prisma.requisition.count({ where }),
      prisma.requisition.findMany({
        where,
        include: REQUISITION_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json(ok(paginate(rows.map(serializeRequisition), total, page, limit)));
  })
);

router.get(
  "/:id",
  requirePermission("requisition.read"),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const requisition = await prisma.requisition.findUnique({
      where: { id: req.params.id },
      include: REQUISITION_INCLUDE,
    });
    if (!requisition) throw Errors.notFound("Requisition", req.params.id);
    res.json(ok(serializeRequisition(requisition)));
  })
);

router.post(
  "/",
  requirePermission("requisition.create"),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const body = val.requisitionSchema.parse(req.body);
    if (!req.userId) throw Errors.unauthorized();

    const requiredDate = body.requiredDate ? new Date(body.requiredDate) : new Date();

    // Same sequential scheme as GRN/ISS/TRF (was Date.now()-based, which both
    // looked different to users and could collide within the same millisecond).
    const requisition = await withUniqueRetry(() => prisma.$transaction(async (tx) => {
      const code = await nextDocumentCode("REQ", (startsWith) =>
        tx.requisition.count({ where: { code: { startsWith } } })
      );
      return tx.requisition.create({
        data: {
          code,
          requestedById: req.userId!,
          department: body.department,
          status: "DRAFT",
          requiredDate,
          notes: body.notes ?? null,
          items: {
            create: body.items.map((item) => ({
              itemId: item.itemId,
              quantity: item.quantity,
            })),
          },
        },
        include: REQUISITION_INCLUDE,
      });
    }));

    await recordAudit({
      ctx: { userId: req.userId, ipAddress: (req as any)._clientIp },
      action: "REQUISITION_CREATED",
      module: "requisitions",
      entity: "requisition",
      entityId: requisition.id,
      newValue: {
        code: requisition.code,
        department: requisition.department,
        status: requisition.status,
        requiredDate: requisition.requiredDate.toISOString(),
        itemCount: requisition._count.items,
      },
      description: `Created requisition ${requisition.code}`,
    });

    res.status(201).json(ok(serializeRequisition(requisition), "Requisition created successfully"));
  })
);

router.post(
  "/:id/submit",
  requirePermission("requisition.create"),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    if (!req.userId) throw Errors.unauthorized();

    const requisition = await prisma.requisition.findUnique({ where: { id: req.params.id } });
    if (!requisition) throw Errors.notFound("Requisition", req.params.id);
    if (requisition.requestedById !== req.userId && !req.roles.has(ROLES.ADMINISTRATOR)) {
      throw Errors.forbidden("You can only submit your own requisitions");
    }
    if (requisition.status !== "DRAFT") {
      throw Errors.invalidRequisition("Only draft requisitions can be submitted");
    }

    const updated = await prisma.requisition.update({
      where: { id: requisition.id },
      data: { status: "SUBMITTED" },
      include: REQUISITION_INCLUDE,
    });

    await recordAudit({
      ctx: { userId: req.userId, ipAddress: (req as any)._clientIp },
      action: "REQUISITION_SUBMITTED",
      module: "requisitions",
      entity: "requisition",
      entityId: updated.id,
      oldValue: { status: "DRAFT" },
      newValue: { status: updated.status },
      description: `Submitted requisition ${updated.code}`,
    });

    res.json(ok(serializeRequisition(updated), "Requisition submitted successfully"));
  })
);

router.post(
  "/:id/decision",
  requirePermission("requisition.approve"),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    if (!req.userId) throw Errors.unauthorized();
    const body = val.requisitionDecisionSchema.parse(req.body);
    const decision = body.decision;

    const requisition = await prisma.requisition.findUnique({
      where: { id: req.params.id },
      include: { approvals: true },
    });
    if (!requisition) throw Errors.notFound("Requisition", req.params.id);
    if (!["SUBMITTED", "PENDING_APPROVAL"].includes(requisition.status)) {
      throw Errors.invalidRequisition("Only submitted requisitions can be approved or rejected");
    }
    // A requester approving their own request defeats the point of the approval
    // step, so it is refused even when they hold requisition.approve.
    if (requisition.requestedById === req.userId) {
      throw Errors.forbidden("You cannot approve your own requisition");
    }
    if (requisition.approvals.some((approval) => approval.approverId === req.userId)) {
      throw Errors.conflict("You have already reviewed this requisition");
    }

    await prisma.$transaction(async (tx) => {
      await tx.requisitionApproval.create({
        data: {
          requisitionId: requisition.id,
          approverId: req.userId!,
          status: decision,
          comments: body.comments ?? null,
        },
      });

      const [approvals, rejections] = await Promise.all([
        tx.requisitionApproval.count({ where: { requisitionId: requisition.id, status: "APPROVED" } }),
        tx.requisitionApproval.count({ where: { requisitionId: requisition.id, status: "REJECTED" } }),
      ]);

      const nextStatus: RequisitionStatus = rejections > 0
        ? "REJECTED"
        : approvals >= REQUIRED_APPROVALS
          ? "APPROVED"
          : "PENDING_APPROVAL";

      await tx.requisition.update({ where: { id: requisition.id }, data: { status: nextStatus } });
    });

    const updated = await prisma.requisition.findUniqueOrThrow({
      where: { id: requisition.id },
      include: REQUISITION_INCLUDE,
    });

    await recordAudit({
      ctx: { userId: req.userId, ipAddress: (req as any)._clientIp },
      action: decision === "APPROVED" ? "REQUISITION_APPROVED" : "REQUISITION_REJECTED",
      module: "requisitions",
      entity: "requisition",
      entityId: updated.id,
      oldValue: { status: requisition.status },
      newValue: { status: updated.status, comments: body.comments ?? null },
      description: `${decision === "APPROVED" ? "Approved" : "Rejected"} requisition ${updated.code}`,
    });

    const approvalsSoFar = updated.approvals.length
      ? await prisma.requisitionApproval.count({ where: { requisitionId: updated.id, status: "APPROVED" } })
      : 0;
    const message = updated.status === "PENDING_APPROVAL"
      ? `Approval recorded — ${approvalsSoFar} of ${REQUIRED_APPROVALS} required approvals`
      : `Requisition ${decision === "APPROVED" ? "approved" : "rejected"}`;

    res.json(ok(serializeRequisition(updated), message));
  })
);

router.post(
  "/:id/cancel",
  requirePermission("requisition.create"),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    if (!req.userId) throw Errors.unauthorized();

    const requisition = await prisma.requisition.findUnique({ where: { id: req.params.id } });
    if (!requisition) throw Errors.notFound("Requisition", req.params.id);
    if (requisition.requestedById !== req.userId && !req.roles.has(ROLES.ADMINISTRATOR)) {
      throw Errors.forbidden("You can only cancel your own requisitions");
    }
    if (["FULFILLED", "CANCELLED"].includes(requisition.status)) {
      throw Errors.invalidRequisition(`A ${requisition.status.toLowerCase()} requisition cannot be cancelled`);
    }

    const updated = await prisma.requisition.update({
      where: { id: requisition.id },
      data: { status: "CANCELLED" },
      include: REQUISITION_INCLUDE,
    });

    await recordAudit({
      ctx: { userId: req.userId, ipAddress: (req as any)._clientIp },
      action: "REQUISITION_CANCELLED",
      module: "requisitions",
      entity: "requisition",
      entityId: updated.id,
      oldValue: { status: requisition.status },
      newValue: { status: "CANCELLED" },
      description: `Cancelled requisition ${updated.code}`,
    });

    res.json(ok(serializeRequisition(updated), "Requisition cancelled"));
  })
);

export default router;
