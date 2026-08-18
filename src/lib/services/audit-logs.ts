import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function listAuditLogs(params: {
  page: number;
  limit: number;
  search?: string;
  userId?: string;
  module?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}) {
  const where: Prisma.AuditLogWhereInput = {};
  if (params.userId) where.userId = params.userId;
  if (params.module) where.module = params.module;
  if (params.action) where.action = { contains: params.action };
  if (params.search) {
    where.OR = [
      { action: { contains: params.search } },
      { module: { contains: params.search } },
      { description: { contains: params.search } },
      { entity: { contains: params.search } },
    ];
  }
  if (params.startDate || params.endDate) {
    where.timestamp = {};
    if (params.startDate) where.timestamp.gte = new Date(params.startDate);
    if (params.endDate) where.timestamp.lte = new Date(params.endDate);
  }

  const [total, items] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      include: { user: true },
    }),
  ]);

  return {
    total,
    items: items.map((a) => ({
      id: a.id,
      action: a.action,
      module: a.module,
      entity: a.entity,
      entityId: a.entityId,
      user: a.user ? { id: a.user.id, fullName: a.user.fullName, email: a.user.email } : null,
      oldValue: a.oldValue,
      newValue: a.newValue,
      ipAddress: a.ipAddress,
      description: a.description,
      timestamp: a.timestamp.toISOString(),
    })),
  };
}

export async function listModules() {
  const result = await db.auditLog.findMany({
    where: {},
    distinct: ["module"],
    select: { module: true },
  });
  return result.map((r) => r.module).sort();
}
