import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { recordAudit } from "./audit";

export async function listSuppliers(params: { page: number; limit: number; search?: string; status?: string }) {
  const where: Prisma.SupplierWhereInput = { deletedAt: null };
  if (params.search) {
    where.OR = [
      { code: { contains: params.search } }, { name: { contains: params.search } },
      { contactPerson: { contains: params.search } }, { email: { contains: params.search } },
    ];
  }
  if (params.status) where.status = params.status as any;
  const [total, items] = await Promise.all([
    prisma.supplier.count({ where }),
    prisma.supplier.findMany({
      where, orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit, take: params.limit,
      include: { _count: { select: { receipts: true } } },
    }),
  ]);
  return { total, items: items.map((s) => ({
    id: s.id, code: s.code, name: s.name, contactPerson: s.contactPerson, email: s.email,
    phone: s.phone, address: s.address, status: s.status, receiptCount: s._count.receipts,
    createdAt: s.createdAt.toISOString(),
  })) };
}

export async function getSupplier(id: string) {
  const s = await prisma.supplier.findFirst({
    where: { id, deletedAt: null },
    include: { receipts: { orderBy: { receiptDate: "desc" }, take: 20, include: { _count: { select: { items: true } } } }, _count: { select: { receipts: true } } },
  });
  if (!s) throw Errors.notFound("Supplier", id);
  return {
    id: s.id, code: s.code, name: s.name, contactPerson: s.contactPerson, email: s.email,
    phone: s.phone, address: s.address, status: s.status, receiptCount: s._count.receipts,
    receipts: s.receipts.map((r) => ({
      id: r.id, code: r.code, receiptDate: r.receiptDate.toISOString(), status: r.status,
      totalAmount: r.totalAmount, totalQuantity: r.totalQuantity, itemCount: r._count.items,
    })),
  };
}

export async function createSupplier(input: { name: string; contactPerson?: string; email?: string; phone?: string; address?: string; status?: any }, auditCtx?: { userId?: string }) {
  const code = `SUP-${String(await prisma.supplier.count() + 1).padStart(4, "0")}`;
  const s = await prisma.supplier.create({ data: { code, name: input.name, contactPerson: input.contactPerson ?? null, email: input.email ?? null, phone: input.phone ?? null, address: input.address ?? null, status: input.status ?? "ACTIVE" } });
  await recordAudit({ ctx: { userId: auditCtx?.userId }, action: "SUPPLIER_CREATED", module: "suppliers", entity: "supplier", entityId: s.id, newValue: { code: s.code, name: s.name } });
  return s;
}

export async function updateSupplier(id: string, input: any, auditCtx?: { userId?: string }) {
  const existing = await prisma.supplier.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw Errors.notFound("Supplier", id);
  const s = await prisma.supplier.update({ where: { id }, data: input });
  await recordAudit({ ctx: { userId: auditCtx?.userId }, action: "SUPPLIER_UPDATED", module: "suppliers", entity: "supplier", entityId: id, oldValue: existing, newValue: input });
  return s;
}

export async function deleteSupplier(id: string, auditCtx?: { userId?: string }) {
  const existing = await prisma.supplier.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw Errors.notFound("Supplier", id);
  await prisma.supplier.update({ where: { id }, data: { deletedAt: new Date(), status: "INACTIVE" } });
  await recordAudit({ ctx: { userId: auditCtx?.userId }, action: "SUPPLIER_DELETED", module: "suppliers", entity: "supplier", entityId: id });
  return true;
}
