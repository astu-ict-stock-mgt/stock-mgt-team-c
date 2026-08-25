import { z } from "zod";

// Password validation schema - Relaxed but secure
// Minimum 8 characters with uppercase, lowercase, and number OR special character
const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must not exceed 128 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .refine(
    (password) => /[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password),
    { message: "Password must contain at least one number or special character" }
  );

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

export const profileSchema = z.object({
  fullName: z.string().min(2).optional(),
  department: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  fullName: z.string().min(2),
  password: passwordSchema,
  department: z.string().optional(),
  phoneNumber: z.string().optional(),
  roleIds: z.array(z.string()).default([]),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).optional(),
  fullName: z.string().min(2).optional(),
  department: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "LOCKED", "PENDING"]).optional(),
  roleIds: z.array(z.string()).optional(),
});

export const supplierSchema = z.object({
  name: z.string().min(2),
  contactPerson: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "BLACKLISTED"]).optional(),
});

export const categorySchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional(),
});

export const storeSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  location: z.string().optional(),
});

export const itemSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional(),
  categoryId: z.string().min(1),
  uomId: z.string().min(1),
  minStock: z.coerce.number().min(0).default(0),
  maxStock: z.coerce.number().min(0).default(0),
  safetyStock: z.coerce.number().min(0).default(0),
  reorderLevel: z.coerce.number().min(0).default(0),
});

export const receiptSchema = z.object({
  supplierId: z.string().min(1),
  storeId: z.string().min(1),
  inspectionNotes: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string().min(1),
    quantity: z.number().positive(),
    unitCost: z.number().min(0),
    inspected: z.boolean().optional(),
    inspectionPassed: z.boolean().optional(),
    remarks: z.string().optional(),
  })).min(1),
});

export const issueSchema = z.object({
  sourceStoreId: z.string().min(1),
  destStoreId: z.string().optional(),
  department: z.string().min(1),
  requisitionId: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string().min(1),
    quantity: z.number().positive(),
    remarks: z.string().optional(),
  })).min(1),
});

export const requisitionSchema = z.object({
  department: z.string().min(1),
  requiredDate: z.union([
    z.string().datetime(),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ]).optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string().min(1),
    quantity: z.number().positive(),
  })).min(1),
});

export const requisitionDecisionSchema = z.object({
  // Was read straight off req.body and hand-checked; validated here so an
  // invalid decision fails with the standard validation error shape.
  decision: z.preprocess(
    (v) => (typeof v === "string" ? v.toUpperCase() : v),
    z.enum(["APPROVED", "REJECTED"])
  ),
  comments: z.string().optional(),
});

export const transferSchema = z.object({
  fromStoreId: z.string().min(1),
  toStoreId: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string().min(1),
    quantity: z.number().positive(),
  })).min(1),
});

export const roleSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().optional(),
});

export const togglePermissionSchema = z.object({
  permission: z.string().min(1),
  enable: z.boolean(),
});
