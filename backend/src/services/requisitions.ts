import { Prisma, RequisitionStatus, ApprovalStatus } from "@prisma/client";
import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { recordAudit, AuditContext } from "./audit";

// Helpers
function generateRequisitionCode(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `REQ-${dateStr}-${rand}`;
}

export async function listRequisitions(params: { status?: RequisitionStatus; department?: string; requestedById?: string }) {
  const where: Prisma.RequisitionWhereInput = {};
  if (params.status) where.status = params.status;
  if (params.department) where.department = { contains: params.department, mode: "insensitive" };
  if (params.requestedById) where.requestedById = params.requestedById;

  return prisma.requisition.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: { select: { id: true, name: true, role: true } },
      items: { include: { item: { select: { id: true, code: true, name: true, uom: true } } } },
    }
  });
}

export async function getRequisition(id: string) {
  const req = await prisma.requisition.findUnique({
    where: { id },
    include: {
      requestedBy: { select: { id: true, name: true, role: true } },
      items: { include: { item: { select: { id: true, code: true, name: true, uom: true } } } },
      approvals: {
        include: { approver: { select: { id: true, name: true, role: true } } },
        orderBy: { approvedAt: "asc" }
      },
      sivs: true
    }
  });
  if (!req) throw Errors.notFound("Requisition", id);
  return req;
}

export async function createRequisition(data: any, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  const code = generateRequisitionCode();
  
  const req = await prisma.requisition.create({
    data: {
      code,
      requestedById: ctx.userId,
      department: data.department,
      destinationDepartment: data.destinationDepartment,
      requiredDate: data.requiredDate,
      purpose: data.purpose,
      notes: data.notes,
      status: RequisitionStatus.DRAFT,
      items: {
        create: data.items.map((i: any) => ({
          itemId: i.itemId,
          quantity: i.quantity,
          fulfilledQty: 0
        }))
      }
    },
    include: { items: true }
  });

  await recordAudit({
    ctx,
    action: "CREATED", module: "requisitions", entity: "requisition", entityId: req.id, newValue: req
  });

  return req;
}

export async function updateRequisition(id: string, data: any, ctx: AuditContext) {
  const req = await getRequisition(id);
  if (req.status !== RequisitionStatus.DRAFT) {
    throw Errors.conflict("Only DRAFT requisitions can be updated.");
  }

  const updateData: any = {
    department: data.department,
    destinationDepartment: data.destinationDepartment,
    requiredDate: data.requiredDate,
    purpose: data.purpose,
    notes: data.notes,
  };

  const updatedReq = await prisma.$transaction(async (tx) => {
    // If items are provided, replace them all
    if (data.items) {
      await tx.requisitionItem.deleteMany({ where: { requisitionId: id } });
      await tx.requisitionItem.createMany({
        data: data.items.map((i: any) => ({
          requisitionId: id,
          itemId: i.itemId,
          quantity: i.quantity,
          fulfilledQty: 0
        }))
      });
    }

    return tx.requisition.update({
      where: { id },
      data: updateData,
      include: { items: true }
    });
  });

  await recordAudit({
    ctx,
    action: "UPDATED", module: "requisitions", entity: "requisition", entityId: updatedReq.id, newValue: updatedReq
  });

  return updatedReq;
}

export async function submitRequisition(id: string, ctx: AuditContext) {
  const req = await getRequisition(id);
  if (req.status !== RequisitionStatus.DRAFT) {
    throw Errors.conflict("Only DRAFT requisitions can be submitted.");
  }

  const updatedReq = await prisma.requisition.update({
    where: { id },
    data: { status: RequisitionStatus.SUBMITTED }
  });

  await recordAudit({
    ctx,
    action: "UPDATED", module: "requisitions", entity: "requisition", entityId: updatedReq.id, newValue: updatedReq
  });

  return updatedReq;
}

export async function getApprovals(id: string) {
  return prisma.requisitionApproval.findMany({
    where: { requisitionId: id },
    include: { approver: { select: { id: true, name: true, role: true } } },
    orderBy: { approvedAt: "desc" }
  });
}

export async function approveRequisition(id: string, data: { comments?: string }, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  const req = await getRequisition(id);
  if (req.status !== RequisitionStatus.SUBMITTED && req.status !== RequisitionStatus.UNDER_REVIEW) {
    throw Errors.conflict("Requisition must be SUBMITTED or UNDER_REVIEW to be approved.");
  }

  const updatedReq = await prisma.$transaction(async (tx) => {
    await tx.requisitionApproval.create({
      data: {
        requisitionId: id,
        approverId: ctx.userId!,
        status: ApprovalStatus.APPROVED,
        comments: data.comments
      }
    });

    return tx.requisition.update({
      where: { id },
      data: { status: RequisitionStatus.APPROVED }
    });
  });

  await recordAudit({
    ctx,
    action: "UPDATED", module: "requisitions", entity: "requisition", entityId: updatedReq.id, newValue: updatedReq
  });

  return updatedReq;
}

export async function rejectRequisition(id: string, data: { comments: string }, ctx: AuditContext) {
  if (!ctx.userId) throw Errors.unauthorized();

  const req = await getRequisition(id);
  if (req.status !== RequisitionStatus.SUBMITTED && req.status !== RequisitionStatus.UNDER_REVIEW) {
    throw Errors.conflict("Requisition must be SUBMITTED or UNDER_REVIEW to be rejected.");
  }

  const updatedReq = await prisma.$transaction(async (tx) => {
    await tx.requisitionApproval.create({
      data: {
        requisitionId: id,
        approverId: ctx.userId!,
        status: ApprovalStatus.REJECTED,
        comments: data.comments
      }
    });

    return tx.requisition.update({
      where: { id },
      data: { status: RequisitionStatus.REJECTED }
    });
  });

  await recordAudit({
    ctx,
    action: "UPDATED", module: "requisitions", entity: "requisition", entityId: updatedReq.id, newValue: updatedReq
  });

  return updatedReq;
}
