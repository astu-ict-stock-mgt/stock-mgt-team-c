import { db } from "@/lib/db";
import { Errors } from "@/lib/utils/errors";
import { verifyPassword } from "@/lib/utils/crypto";
import { generateToken, generateRefreshToken } from "@/lib/utils/crypto";
import { recordAudit, AuditContext } from "@/lib/services/audit";

const SESSION_DURATION_HOURS = 12;
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

export async function login(email: string, password: string, ip?: string) {
  const user = await db.user.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null },
    include: {
      userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
    },
  });
  if (!user) {
    await recordAudit({ ctx: { ipAddress: ip }, action: "LOGIN_FAILED", module: "auth", entity: "user", description: `Unknown email: ${email}` });
    throw Errors.invalidCredentials();
  }

  if (user.status === "LOCKED" || (user.lockedUntil && user.lockedUntil > new Date())) {
    throw Errors.accountLocked();
  }
  if (user.status === "INACTIVE" || user.status === "PENDING") {
    throw Errors.accountInactive();
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const failed = user.failedLoginCount + 1;
    const shouldLock = failed >= MAX_FAILED_LOGINS;
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: failed,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : user.lockedUntil,
        status: shouldLock ? "LOCKED" : user.status,
      },
    });
    await recordAudit({ ctx: { userId: user.id, ipAddress: ip }, action: "LOGIN_FAILED", module: "auth", entity: "user", entityId: user.id, description: `Failed attempt ${failed}` });
    throw Errors.invalidCredentials();
  }

  // Reset failure counters and create a session.
  const token = generateToken();
  const refresh = generateRefreshToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 3_600_000);
  await db.userSession.create({ data: { userId: user.id, token, refresh, expiresAt, ip, userAgent: null } });
  await db.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date(), status: "ACTIVE" },
  });
  await recordAudit({ ctx: { userId: user.id, ipAddress: ip }, action: "LOGIN_SUCCESS", module: "auth", entity: "user", entityId: user.id });

  return {
    user: publicUser(user),
    token,
    refresh,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function logout(token: string) {
  if (token) {
    await db.userSession.deleteMany({ where: { token } }).catch(() => {});
  }
  return true;
}

export async function resolveSession(token: string | null | undefined) {
  if (!token) return null;
  const session = await db.userSession.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  permissions: { include: { permission: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.userSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session;
}

export function publicUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    status: user.status,
    department: user.department ?? null,
    phoneNumber: user.phoneNumber ?? null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    roles: (user.userRoles ?? []).map((ur: any) => ({
      id: ur.role?.id,
      name: ur.role?.name,
      description: ur.role?.description ?? null,
      permissions: (ur.role?.permissions ?? []).map((rp: any) => rp.permission?.name).filter(Boolean),
    })),
  };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw Errors.notFound("User");
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw Errors.invalidCredentials();
  const { hashPassword } = await import("@/lib/utils/crypto");
  const hash = await hashPassword(newPassword);
  await db.user.update({ where: { id: userId }, data: { passwordHash: hash } });
  await recordAudit({ ctx: { userId }, action: "PASSWORD_CHANGED", module: "auth", entity: "user", entityId: userId });
  return true;
}
