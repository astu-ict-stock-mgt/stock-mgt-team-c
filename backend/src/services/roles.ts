import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { recordAudit } from "./audit";

const SYSTEM_ROLES = ["ADMINISTRATOR", "PAO", "STOREKEEPER", "STOCK_CLERK", "ACCOUNTANT", "DEPARTMENT_HEAD", "SECURITY_OFFICER", "SUPPLIER"];

export async function listRoles() {
  const roles = await prisma.role.findMany({
    include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
    orderBy: { name: "asc" },
  });
  return roles.map((r) => ({
    id: r.id, name: r.name, description: r.description, userCount: r._count.users,
    permissions: r.permissions.map((rp) => rp.permission.name),
  }));
}

export async function getRole(id: string) {
  const role = await prisma.role.findUnique({
    where: { id },
    include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
  });
  if (!role) throw Errors.notFound("Role", id);
  return {
    id: role.id, name: role.name, description: role.description, userCount: role._count.users,
    permissions: role.permissions.map((rp) => rp.permission.name),
  };
}

export async function createRole(input: { name: string; description?: string; permissionIds?: string[] }, auditCtx?: { userId?: string }) {
  const existing = await prisma.role.findUnique({ where: { name: input.name.toUpperCase() } });
  if (existing) throw Errors.duplicate("Role", "name");

  const role = await prisma.$transaction(async (tx) => {
    const r = await tx.role.create({ data: { name: input.name.toUpperCase(), description: input.description ?? null } });
    if (input.permissionIds && input.permissionIds.length) {
      await tx.rolePermission.createMany({ data: input.permissionIds.map((pid) => ({ roleId: r.id, permissionId: pid })) });
    }
    return r;
  });

  await recordAudit({ ctx: { userId: auditCtx?.userId }, action: "ROLE_CREATED", module: "roles", entity: "role", entityId: role.id, newValue: { name: role.name, description: role.description } });
  return getRole(role.id);
}

export async function updateRole(id: string, input: { name?: string; description?: string | null }, auditCtx?: { userId?: string }) {
  const existing = await prisma.role.findUnique({ where: { id } });
  if (!existing) throw Errors.notFound("Role", id);

  if (input.name) {
    const conflict = await prisma.role.findFirst({ where: { name: input.name.toUpperCase(), NOT: { id } } });
    if (conflict) throw Errors.duplicate("Role", "name");
  }

  const data: Prisma.RoleUpdateInput = {};
  if (input.name !== undefined) data.name = input.name.toUpperCase();
  if (input.description !== undefined) data.description = input.description;

  await prisma.role.update({ where: { id }, data });
  await recordAudit({ ctx: { userId: auditCtx?.userId }, action: "ROLE_UPDATED", module: "roles", entity: "role", entityId: id, oldValue: existing, newValue: input });
  return getRole(id);
}

export async function togglePermission(roleId: string, permissionName: string, enable: boolean, auditCtx?: { userId?: string }) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw Errors.notFound("Role", roleId);
  const permission = await prisma.permission.findUnique({ where: { name: permissionName } });
  if (!permission) throw Errors.notFound("Permission", permissionName);

  if (role.name === "ADMINISTRATOR" && !enable) throw Errors.forbidden("Cannot remove permissions from the Administrator role");

  const existing = await prisma.rolePermission.findUnique({ where: { roleId_permissionId: { roleId, permissionId: permission.id } } });
  if (enable && existing) return getRole(roleId);
  if (!enable && !existing) return getRole(roleId);

  if (enable) {
    await prisma.rolePermission.create({ data: { roleId, permissionId: permission.id } });
  } else {
    await prisma.rolePermission.delete({ where: { roleId_permissionId: { roleId, permissionId: permission.id } } });
  }

  await recordAudit({
    ctx: { userId: auditCtx?.userId },
    action: enable ? "PERMISSION_GRANTED" : "PERMISSION_REVOKED", module: "roles", entity: "role", entityId: roleId,
    newValue: { role: role.name, permission: permissionName, action: enable ? "GRANTED" : "REVOKED" },
  });

  return getRole(roleId);
}

export async function deleteRole(id: string, auditCtx?: { userId?: string }) {
  const existing = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
  if (!existing) throw Errors.notFound("Role", id);
  if (SYSTEM_ROLES.includes(existing.name)) throw Errors.forbidden("Cannot delete a built-in system role");
  if (existing._count.users > 0) throw Errors.conflict("Cannot delete a role that has users assigned — reassign them first");
  await prisma.role.delete({ where: { id } });
  await recordAudit({ ctx: { userId: auditCtx?.userId }, action: "ROLE_DELETED", module: "roles", entity: "role", entityId: id });
  return true;
}

export async function listAllPermissions() {
  const items = await prisma.permission.findMany({ orderBy: { module: "asc" } });
  const grouped: Record<string, string[]> = {};
  for (const p of items) {
    if (!grouped[p.module]) grouped[p.module] = [];
    grouped[p.module].push(p.name);
  }
  return { items, grouped };
}
