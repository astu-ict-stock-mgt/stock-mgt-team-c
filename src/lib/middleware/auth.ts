import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveSession, publicUser } from "@/lib/services/auth";
import { Errors } from "@/lib/utils/errors";

export type RequestContext = {
  req: NextRequest;
  userId?: string;
  user?: ReturnType<typeof publicUser> extends infer T ? T : never;
  rawUser?: any;
  permissions: Set<string>;
  roles: Set<string>;
  ip?: string;
};

export async function getRequestContext(req: NextRequest): Promise<RequestContext> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const session = await resolveSession(token);
  if (!session) {
    return { req, permissions: new Set(), roles: new Set(), ip };
  }
  const user = session.user;
  const permissions = new Set<string>();
  const roles = new Set<string>();
  for (const ur of user.userRoles ?? []) {
    roles.add(ur.role.name);
    for (const rp of ur.role.permissions ?? []) {
      permissions.add(rp.permission.name);
    }
  }
  return {
    req,
    userId: user.id,
    rawUser: user,
    user: publicUser(user),
    permissions,
    roles,
    ip,
  };
}

export function requireAuth(ctx: RequestContext) {
  if (!ctx.userId) throw Errors.unauthorized();
  return ctx;
}

export function requirePermission(ctx: RequestContext, ...perms: string[]) {
  requireAuth(ctx);
  // ADMINISTRATOR bypass: any permission implies all
  if (ctx.roles.has("ADMINISTRATOR")) return ctx;
  const hasAll = perms.every((p) => ctx.permissions.has(p));
  if (!hasAll) throw Errors.forbidden();
  return ctx;
}

export function requireAnyPermission(ctx: RequestContext, ...perms: string[]) {
  requireAuth(ctx);
  if (ctx.roles.has("ADMINISTRATOR")) return ctx;
  const hasAny = perms.some((p) => ctx.permissions.has(p));
  if (!hasAny) throw Errors.forbidden();
  return ctx;
}
