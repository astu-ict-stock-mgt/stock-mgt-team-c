import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { Errors } from "@/lib/utils/errors";
import { hashPassword } from "@/lib/utils/crypto";
import { recordAudit } from "@/lib/services/audit";
import { publicUser } from "@/lib/services/auth";

export async function listUsers(params: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  roleId?: string;
}) {
  const where: Prisma.UserWhereInput = { deletedAt: null };
  if (params.search) {
    where.OR = [
      { email: { contains: params.search } },
      { username: { contains: params.search } },
      { fullName: { contains: params.search } },
    ];
  }
  if (params.status) where.status = params.status as any;
  if (params.roleId) where.userRoles = { some: { roleId: params.roleId } };

  const [total, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      include: { userRoles: { include: { role: true } } },
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
  ]);

  return {
    total,
    items: rows.map((u) => ({
      ...publicUser(u),
      roles: u.userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
    })),
  };
}

export async function getUser(id: string) {
  const user = await db.user.findFirst({
    where: { id, deletedAt: null },
    include: { userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
  });
  if (!user) throw Errors.notFound("User", id);
  return publicUser(user);
}

export async function createUser(input: {
  email: string;
  username: string;
  fullName: string;
  password: string;
  department?: string;
  phoneNumber?: string;
  roleIds: string[];
}, auditCtx?: { userId?: string }) {
  const existing = await db.user.findFirst({
    where: {
      OR: [{ email: input.email.toLowerCase() }, { username: input.username }],
      deletedAt: null,
    },
  });
  if (existing) throw Errors.duplicate("User", "email or username");

  const passwordHash = await hashPassword(input.password);
  const user = await db.user.create({
    data: {
      email: input.email.toLowerCase(),
      username: input.username,
      fullName: input.fullName,
      passwordHash,
      department: input.department ?? null,
      phoneNumber: input.phoneNumber ?? null,
      userRoles: input.roleIds.length
        ? { create: input.roleIds.map((rid) => ({ roleId: rid })) }
        : undefined,
    },
    include: { userRoles: { include: { role: true } } },
  });
  await recordAudit({
    ctx: { userId: auditCtx?.userId },
    action: "USER_CREATED",
    module: "users",
    entity: "user",
    entityId: user.id,
    newValue: { email: user.email, username: user.username, fullName: user.fullName, roleIds: input.roleIds },
  });
  return publicUser(user);
}

export async function updateUser(id: string, input: Partial<{
  email: string;
  username: string;
  fullName: string;
  department: string | null;
  phoneNumber: string | null;
  status: "ACTIVE" | "INACTIVE" | "LOCKED" | "PENDING";
  roleIds: string[];
}>, auditCtx?: { userId?: string }) {
  const existing = await db.user.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw Errors.notFound("User", id);

  const data: Prisma.UserUpdateInput = {};
  if (input.email) data.email = input.email.toLowerCase();
  if (input.username) data.username = input.username;
  if (input.fullName) data.fullName = input.fullName;
  if (input.department !== undefined) data.department = input.department;
  if (input.phoneNumber !== undefined) data.phoneNumber = input.phoneNumber;
  if (input.status) data.status = input.status;

  const updated = await db.$transaction(async (tx) => {
    const u = await tx.user.update({ where: { id }, data });
    if (input.roleIds) {
      await tx.userRole.deleteMany({ where: { userId: id } });
      if (input.roleIds.length) {
        await tx.userRole.createMany({ data: input.roleIds.map((rid) => ({ userId: id, roleId: rid })) });
      }
    }
    return tx.user.findUniqueOrThrow({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });
  });

  await recordAudit({
    ctx: { userId: auditCtx?.userId },
    action: "USER_UPDATED",
    module: "users",
    entity: "user",
    entityId: id,
    oldValue: { email: existing.email, username: existing.username, fullName: existing.fullName },
    newValue: input,
  });
  return publicUser(updated);
}

export async function deleteUser(id: string, auditCtx?: { userId?: string }) {
  const existing = await db.user.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw Errors.notFound("User", id);
  await db.user.update({ where: { id }, data: { deletedAt: new Date(), status: "INACTIVE" } });
  await db.userSession.deleteMany({ where: { userId: id } });
  await recordAudit({
    ctx: { userId: auditCtx?.userId },
    action: "USER_DELETED",
    module: "users",
    entity: "user",
    entityId: id,
  });
  return true;
}

export async function resetUserPassword(id: string, newPassword: string, auditCtx?: { userId?: string }) {
  const user = await db.user.findFirst({ where: { id, deletedAt: null } });
  if (!user) throw Errors.notFound("User", id);
  const passwordHash = await hashPassword(newPassword);
  await db.user.update({ where: { id }, data: { passwordHash, failedLoginCount: 0, lockedUntil: null, status: "ACTIVE" } });
  await db.userSession.deleteMany({ where: { userId: id } });
  await recordAudit({
    ctx: { userId: auditCtx?.userId },
    action: "PASSWORD_RESET",
    module: "users",
    entity: "user",
    entityId: id,
  });
  return true;
}
