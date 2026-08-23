import { z } from "zod";
import { RequisitionStatus, ApprovalStatus } from "@prisma/client";

export const CreateRequisitionSchema = z.object({
  department: z.string().min(2),
  destinationDepartment: z.string().optional(),
  requiredDate: z.string().datetime().or(z.date()),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string().cuid(),
    quantity: z.number().positive(),
  })).min(1, "At least one item is required"),
});

export const UpdateRequisitionSchema = z.object({
  department: z.string().min(2).optional(),
  destinationDepartment: z.string().optional(),
  requiredDate: z.string().datetime().or(z.date()).optional(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string().cuid(),
    quantity: z.number().positive(),
  })).min(1, "At least one item is required").optional(),
});

export const ApproveRequisitionSchema = z.object({
  comments: z.string().optional(),
});

export const RejectRequisitionSchema = z.object({
  comments: z.string().min(1, "Rejection reason is required"),
});
