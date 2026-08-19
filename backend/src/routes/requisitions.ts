import { Prisma, RequisitionStatus } from "@prisma/client";
import { Router, Response } from "express";
import { prisma } from "../config/db";
import { ok, paginate } from "../utils/response";
import { asyncHandler, requirePermission, AuthedRequest } from "../middleware/auth";
import { qp, qpInt } from "../utils/query";
import * as val from "../validators";
import { recordAudit } from "../services/audit";
import { Errors } from "../utils/errors";

const router = Router();

router.get(
  "/",
  requirePermission("requisition.read"),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const page = qpInt(req, "page", 1);
    const limit = qpInt(req, "limit", 15);
    const search = qp(req, "search");
    const status = qp(req, "status");
    const department = qp(req, "department");
    const allowedStatuses: RequisitionStatus[] = [
      "DRAFT",
      "SUBMITTED",
      "PENDING_APPROVAL",
      "APPROVED",
      "REJECTED",
      "PARTIALLY_FULFILLED",
      "FULFILLED",
      "CANCELLED",
    ];

    const where: Prisma.RequisitionWhereInput = {};
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { department: { contains: search } },
        { notes: { contains: search } },
      ];
    }
    if (status && allowedStatuses.includes(status as RequisitionStatus)) where.status = status as RequisitionStatus;
    if (department) where.department = department;

    const [total, rows] = await Promise.all([
      prisma.requisition.count({ where }),
      prisma.requisition.findMany({
        where,
        include: {
          requestedBy: { select: { id: true, fullName: true, email: true, department: true } },
          _count: { select: { items: true, approvals: true } },
          items: { include: { item: { select: { id: true, code: true, name: true } } } },
          approvals: { include: { approver: { select: { id: true, fullName: true, email: true } } }, orderBy: { approvedAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json(ok(paginate(rows.map((requisition) => ({
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
      })),
      latestApproval: requisition.approvals[0]
        ? {
          id: requisition.approvals[0].id,
          status: requisition.approvals[0].status,
          approver: requisition.approvals[0].approver,
          approvedAt: requisition.approvals[0].approvedAt.toISOString(),
          comments: requisition.approvals[0].comments,
        }
        : null,
    })), total, page, limit)));
  })
);

router.post(
  "/",
  requirePermission("requisition.create"),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const body = val.requisitionSchema.parse(req.body);
    if (!req.userId) throw Errors.unauthorized();

    const requiredDate = body.requiredDate ? new Date(body.requiredDate) : new Date();
    const code = `REQ-${Date.now().toString().slice(-8)}`;

    const requisition = await prisma.requisition.create({
      data: {
        code,
        requestedById: req.userId,
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
      include: {
        requestedBy: { select: { id: true, fullName: true, email: true, department: true } },
        _count: { select: { items: true, approvals: true } },
        items: { include: { item: { select: { id: true, code: true, name: true } } } },
        approvals: { include: { approver: { select: { id: true, fullName: true, email: true } } }, orderBy: { approvedAt: "desc" }, take: 1 },
      },
    });

    await recordAudit({
      ctx: { userId: req.userId, ipAddress: (req as any)._clientIp },
      action: "REQUISITION_CREATED",
      module: "REQUISITIONS",
      entity: "Requisition",
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

    res.status(201).json(ok({
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
      })),
      latestApproval: requisition.approvals[0]
        ? {
          id: requisition.approvals[0].id,
          status: requisition.approvals[0].status,
          approver: requisition.approvals[0].approver,
          approvedAt: requisition.approvals[0].approvedAt.toISOString(),
          comments: requisition.approvals[0].comments,
        }
        : null,
    }, "Requisition created successfully"));
  })
);

router.post(
  "/:id/submit",
  requirePermission("requisition.create"),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    if (!req.userId) throw Errors.unauthorized();

    const requisition = await prisma.requisition.findUnique({ where: { id: req.params.id } });
    if (!requisition) throw Errors.notFound("Requisition", req.params.id);
    if (requisition.requestedById !== req.userId && !req.roles.has("ADMINISTRATOR")) {
      throw Errors.forbidden("You can only submit your own requisitions");
    }
    if (requisition.status !== "DRAFT") {
      throw Errors.invalidRequisition("Only draft requisitions can be submitted");
    }

    const updated = await prisma.requisition.update({
      where: { id: requisition.id },
      data: { status: "SUBMITTED" },
      include: {
        requestedBy: { select: { id: true, fullName: true, email: true, department: true } },
        _count: { select: { items: true, approvals: true } },
        items: { include: { item: { select: { id: true, code: true, name: true } } } },
        approvals: { include: { approver: { select: { id: true, fullName: true, email: true } } }, orderBy: { approvedAt: "desc" }, take: 1 },
      },
    });

    await recordAudit({
      ctx: { userId: req.userId, ipAddress: (req as any)._clientIp },
      action: "REQUISITION_SUBMITTED",
      module: "REQUISITIONS",
      entity: "Requisition",
      entityId: updated.id,
      oldValue: { status: "DRAFT" },
      newValue: { status: updated.status },
      description: `Submitted requisition ${updated.code}`,
    });

    res.json(ok({
      id: updated.id,
      code: updated.code,
      requestedBy: updated.requestedBy,
      department: updated.department,
      status: updated.status,
      requiredDate: updated.requiredDate.toISOString(),
      notes: updated.notes,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      itemCount: updated._count.items,
      approvalCount: updated._count.approvals,
      items: updated.items.map((item) => ({
        id: item.id,
        itemId: item.itemId,
        itemCode: item.item.code,
        itemName: item.item.name,
        quantity: item.quantity,
        fulfilledQty: item.fulfilledQty,
      })),
      latestApproval: updated.approvals[0]
        ? {
          id: updated.approvals[0].id,
          status: updated.approvals[0].status,
          approver: updated.approvals[0].approver,
          approvedAt: updated.approvals[0].approvedAt.toISOString(),
          comments: updated.approvals[0].comments,
        }
        : null,
    }, "Requisition submitted successfully"));
  })
);

router.post(
  "/:id/decision",
  requirePermission("requisition.approve"),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    if (!req.userId) throw Errors.unauthorized();
    const body = val.requisitionDecisionSchema.parse(req.body);
    const decision = String((req.body as any)?.decision || "").toUpperCase();
    if (!["APPROVED", "REJECTED"].includes(decision)) throw Errors.invalidRequisition("Decision must be APPROVED or REJECTED");

    const requisition = await prisma.requisition.findUnique({ where: { id: req.params.id }, include: { approvals: true } });
    if (!requisition) throw Errors.notFound("Requisition", req.params.id);
    if (!["SUBMITTED", "PENDING_APPROVAL"].includes(requisition.status)) {
      throw Errors.invalidRequisition("Only submitted requisitions can be approved or rejected");
    }

    const existingDecision = requisition.approvals.find((approval) => approval.approverId === req.userId);
    if (existingDecision) {
      throw Errors.conflict("You have already reviewed this requisition");
    }

    await prisma.$transaction(async (tx) => {
      await tx.requisitionApproval.create({
        data: {
          requisitionId: requisition.id,
          approverId: req.userId!,
          status: decision as "APPROVED" | "REJECTED",
          comments: body.comments ?? null,
        },
      });

      const approvalCount = await tx.requisitionApproval.count({
        where: { requisitionId: requisition.id, status: "APPROVED" },
      });
      const hasRejection = await tx.requisitionApproval.count({
        where: { requisitionId: requisition.id, status: "REJECTED" },
      });

      const nextStatus: RequisitionStatus = decision === "REJECTED"
        ? "REJECTED"
        : approvalCount >= 2
          ? "APPROVED"
          : "PENDING_APPROVAL";

      await tx.requisition.update({
        where: { id: requisition.id },
        data: { status: hasRejection > 0 ? "REJECTED" : nextStatus },
      });
    });

    const updated = await prisma.requisition.findUnique({
      where: { id: requisition.id },
      include: {
        requestedBy: { select: { id: true, fullName: true, email: true, department: true } },
        _count: { select: { items: true, approvals: true } },
        items: { include: { item: { select: { id: true, code: true, name: true } } } },
        approvals: { include: { approver: { select: { id: true, fullName: true, email: true } } }, orderBy: { approvedAt: "desc" }, take: 1 },
      },
    });

    if (!updated) throw Errors.notFound("Requisition", req.params.id);

    await recordAudit({
      ctx: { userId: req.userId, ipAddress: (req as any)._clientIp },
      action: decision === "APPROVED" ? "REQUISITION_APPROVED" : "REQUISITION_REJECTED",
      module: "REQUISITIONS",
      entity: "Requisition",
      entityId: updated.id,
      oldValue: { status: requisition.status },
      newValue: { status: updated.status, comments: body.comments ?? null },
      description: `${decision === "APPROVED" ? "Approved" : "Rejected"} requisition ${updated.code}`,
    });

    res.json(ok({
      id: updated.id,
      code: updated.code,
      requestedBy: updated.requestedBy,
      department: updated.department,
      status: updated.status,
      requiredDate: updated.requiredDate.toISOString(),
      notes: updated.notes,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      itemCount: updated._count.items,
      approvalCount: updated._count.approvals,
      items: updated.items.map((item) => ({
        id: item.id,
        itemId: item.itemId,
        itemCode: item.item.code,
        itemName: item.item.name,
        quantity: item.quantity,
        fulfilledQty: item.fulfilledQty,
      })),
      latestApproval: updated.approvals[0]
        ? {
          id: updated.approvals[0].id,
          status: updated.approvals[0].status,
          approver: updated.approvals[0].approver,
          approvedAt: updated.approvals[0].approvedAt.toISOString(),
          comments: updated.approvals[0].comments,
        }
        : null,
    }, `Requisition ${decision === "APPROVED" ? "approved" : "rejected"}`));
  })
);

export default router;