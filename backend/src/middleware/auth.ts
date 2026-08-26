import { Request, Response, NextFunction, RequestHandler } from "express";
import { resolveSession, publicUser } from "../services/auth";
import { AuditContext } from "../services/audit";
import { Errors, AppError } from "../utils/errors";
import { ROLES } from "../constants/roles";

export type AuthedRequest = Request & {
  userId?: string;
  user?: ReturnType<typeof publicUser>;
  permissions: Set<string>;
  roles: Set<string>;
  // Express's own req.ip is read-only, so the resolved client address lives here.
  clientIp?: string | null;
};

/**
 * The actor behind the current request, in the shape every service and
 * recordAudit() expects. Routes used to build this inline and most of them
 * left the IP out, which is why audit rows had an empty ipAddress.
 */
export function actorOf(req: AuthedRequest): AuditContext {
  return { userId: req.userId, ip: req.clientIp };
}

export async function attachAuth(req: Request, _res: Response, next: NextFunction) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? null;
  const session = await resolveSession(token);
  const r = req as AuthedRequest;
  r.clientIp = ip;
  if (!session) {
    r.permissions = new Set();
    r.roles = new Set();
    return next();
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
  r.userId = user.id;
  r.user = publicUser(user);
  r.permissions = permissions;
  r.roles = roles;
  next();
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!(req as AuthedRequest).userId) return next(Errors.unauthorized());
  next();
};

export function requirePermission(...perms: string[]): RequestHandler {
  return (req, _res, next) => {
    const r = req as AuthedRequest;
    if (!r.userId) return next(Errors.unauthorized());
    if (r.roles.has(ROLES.ADMINISTRATOR)) return next();
    const hasAll = perms.every((p) => r.permissions.has(p));
    if (!hasAll) return next(Errors.forbidden());
    next();
  };
}

export function requireAnyPermission(...perms: string[]): RequestHandler {
  return (req, _res, next) => {
    const r = req as AuthedRequest;
    if (!r.userId) return next(Errors.unauthorized());
    if (r.roles.has(ROLES.ADMINISTRATOR)) return next();
    const hasAny = perms.some((p) => r.permissions.has(p));
    if (!hasAny) return next(Errors.forbidden());
    next();
  };
}

export function asyncHandler(fn: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req as AuthedRequest, res, next)).catch(next);
  };
}

export { AppError };
