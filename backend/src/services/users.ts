import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { hashPassword } from "../utils/crypto";
import { recordAudit } from "./audit";
import { publicUser } from "./auth";
import { ROLES } from "../constants/roles";

export async function listUsers(params: { page: number; limit: number; search?: string; status?: string; roleId?: string }) {
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
    prisma.user.count({ where }),
    prisma.user.findMany({
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
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    include: { userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
  });
  if (!user) throw Errors.notFound("User", id);
  return publicUser(user);
}

export async function createUser(input: {
  email: string; username: string; fullName: string; password: string;
  department?: string; phoneNumber?: string; roleIds: string[];
}, auditCtx?: { userId?: string }) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email.toLowerCase() }, { username: input.username }], deletedAt: null },
  });
  if (existing) throw Errors.duplicate("User", "email or username");

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(), username: input.username, fullName: input.fullName,
      passwordHash, department: input.department ?? null, phoneNumber: input.phoneNumber ?? null,
      userRoles: input.roleIds.length ? { create: input.roleIds.map((rid) => ({ roleId: rid })) } : undefined,
    },
    include: { userRoles: { include: { role: true } } },
  });
  await recordAudit({ ctx: { userId: auditCtx?.userId }, action: "USER_CREATED", module: "users", entity: "user", entityId: user.id, newValue: { email: user.email, username: user.username, roleIds: input.roleIds } });
  return publicUser(user);
}

// The system must always keep at least one usable administrator. Without these
// guards an admin can delete their own account, deactivate it, or drop the
// ADMINISTRATOR role from the last remaining holder — locking everyone out with
// no recovery path through the API.
async function countOtherActiveAdmins(excludeUserId: string): Promise<number> {
  return prisma.user.count({
    where: {
      id: { not: excludeUserId },
      deletedAt: null,
      status: "ACTIVE",
      userRoles: { some: { role: { name: ROLES.ADMINISTRATOR } } },
    },
  });
}

async function isAdministrator(userId: string): Promise<boolean> {
  const hit = await prisma.userRole.findFirst({
    where: { userId, role: { name: ROLES.ADMINISTRATOR } },
  });
  return !!hit;
}

async function assertNotLastAdmin(userId: string, action: string) {
  if (!(await isAdministrator(userId))) return;
  if ((await countOtherActiveAdmins(userId)) === 0) {
    throw Errors.conflict(`Cannot ${action} the last active administrator — grant the role to another user first`);
  }
}

export async function updateUser(id: string, input: Partial<{
  email: string; username: string; fullName: string; department: string | null;
  phoneNumber: string | null; status: "ACTIVE" | "INACTIVE" | "LOCKED" | "PENDING"; roleIds: string[];
}>, auditCtx?: { userId?: string; ip?: string }) {
  const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw Errors.notFound("User", id);

  if (input.status && input.status !== "ACTIVE") {
    await assertNotLastAdmin(id, `set ${input.status} on`);
  }
  if (input.roleIds) {
    const keepsAdmin = await prisma.role.findFirst({
      where: { id: { in: input.roleIds }, name: ROLES.ADMINISTRATOR },
    });
    if (!keepsAdmin) await assertNotLastAdmin(id, "remove the administrator role from");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const data: Prisma.UserUpdateInput = {};
    if (input.email) data.email = input.email.toLowerCase();
    if (input.username) data.username = input.username;
    if (input.fullName) data.fullName = input.fullName;
    if (input.department !== undefined) data.department = input.department;
    if (input.phoneNumber !== undefined) data.phoneNumber = input.phoneNumber;
    if (input.status) {
      data.status = input.status;
      // Re-activating must also clear the lockout counters, otherwise the very
      // next wrong password re-locks the account (failedLoginCount is still 5).
      if (input.status === "ACTIVE") {
        data.failedLoginCount = 0;
        data.lockedUntil = null;
      }
    }
    const u = await tx.user.update({ where: { id }, data });
    if (input.roleIds) {
      await tx.userRole.deleteMany({ where: { userId: id } });
      if (input.roleIds.length) {
        await tx.userRole.createMany({ data: input.roleIds.map((rid) => ({ userId: id, roleId: rid })) });
      }
    }
    return tx.user.findUniqueOrThrow({ where: { id }, include: { userRoles: { include: { role: true } } } });
  });

  await recordAudit({ ctx: { userId: auditCtx?.userId, ipAddress: auditCtx?.ip }, action: "USER_UPDATED", module: "users", entity: "user", entityId: id, newValue: input });
  return publicUser(updated);
}

export async function deleteUser(id: string, auditCtx?: { userId?: string; ip?: string }) {
  const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw Errors.notFound("User", id);
  if (auditCtx?.userId === id) throw Errors.conflict("You cannot delete your own account");
  await assertNotLastAdmin(id, "delete");
  await prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: "INACTIVE" } });
  await prisma.userSession.deleteMany({ where: { userId: id } });
  await recordAudit({ ctx: { userId: auditCtx?.userId, ipAddress: auditCtx?.ip }, action: "USER_DELETED", module: "users", entity: "user", entityId: id, description: `Deleted ${existing.email}` });
  return true;
}

export async function resetUserPassword(id: string, newPassword: string, auditCtx?: { userId?: string; ip?: string }) {
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!user) throw Errors.notFound("User", id);
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id }, data: { passwordHash, failedLoginCount: 0, lockedUntil: null, status: "ACTIVE" } });
  await prisma.userSession.deleteMany({ where: { userId: id } });
  await recordAudit({ ctx: { userId: auditCtx?.userId, ipAddress: auditCtx?.ip }, action: "PASSWORD_RESET", module: "users", entity: "user", entityId: id, description: `Password reset for ${user.email}` });
  return true;
}

// Clears a lockout without touching the password. Without this there is no way
// back for an account that hit MAX_FAILED_LOGINS — including the last admin.
export async function unlockUser(id: string, auditCtx?: { userId?: string; ip?: string }) {
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!user) throw Errors.notFound("User", id);
  await prisma.user.update({
    where: { id },
    data: { status: "ACTIVE", failedLoginCount: 0, lockedUntil: null },
  });
  await recordAudit({
    ctx: { userId: auditCtx?.userId, ipAddress: auditCtx?.ip },
    action: "USER_UNLOCKED", module: "users", entity: "user", entityId: id,
    oldValue: { status: user.status, failedLoginCount: user.failedLoginCount },
    newValue: { status: "ACTIVE", failedLoginCount: 0 },
    description: `Unlocked ${user.email}`,
  });
  return true;
}
