import { prisma } from "../config/db";
import { Errors } from "../utils/errors";
import { verifyPassword, generateToken } from "../utils/crypto";
import { recordAudit } from "./audit";

const SESSION_DURATION_HOURS = 12;
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
// A refresh token outlives its access token so a user who steps away for a day
// can resume without signing in again.
const REFRESH_DURATION_DAYS = 7;

const sessionExpiry = () => new Date(Date.now() + SESSION_DURATION_HOURS * 3_600_000);
const refreshExpiry = () => new Date(Date.now() + REFRESH_DURATION_DAYS * 86_400_000);

export async function login(email: string, password: string, ip?: string) {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null },
    include: { userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
  });
  if (!user) {
    await recordAudit({ ctx: { ip }, action: "LOGIN_FAILED", module: "auth", entity: "user", description: `Unknown email: ${email}` });
    throw Errors.invalidCredentials();
  }

  const now = new Date();
  if (user.status === "LOCKED" && (!user.lockedUntil || user.lockedUntil > now)) {
    throw Errors.accountLocked();
  }
  if (user.status === "LOCKED" && user.lockedUntil && user.lockedUntil <= now) {
    await prisma.user.update({
      where: { id: user.id },
      data: { status: "ACTIVE", failedLoginCount: 0, lockedUntil: null },
    });
  }
  if (user.status === "INACTIVE" || user.status === "PENDING") {
    throw Errors.accountInactive();
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const failed = user.failedLoginCount + 1;
    const shouldLock = failed >= MAX_FAILED_LOGINS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: failed,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : user.lockedUntil,
        status: shouldLock ? "LOCKED" : user.status,
      },
    });
    await recordAudit({ ctx: { userId: user.id, ip }, action: "LOGIN_FAILED", module: "auth", entity: "user", entityId: user.id, description: `Failed attempt ${failed}` });
    throw Errors.invalidCredentials();
  }

  const token = generateToken();
  const refresh = generateToken();
  const expiresAt = sessionExpiry();
  await prisma.userSession.create({
    data: { userId: user.id, token, refresh, expiresAt, refreshExpiresAt: refreshExpiry(), ip, userAgent: null },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date(), status: "ACTIVE" },
  });
  await recordAudit({ ctx: { userId: user.id, ip }, action: "LOGIN_SUCCESS", module: "auth", entity: "user", entityId: user.id });

  return { user: publicUser(user), token, refresh, expiresAt: expiresAt.toISOString() };
}

export async function logout(token: string) {
  if (token) await prisma.userSession.deleteMany({ where: { token } }).catch(() => { });
  return true;
}

/**
 * Exchanges a refresh token for a fresh access token.
 *
 * Login always handed the browser a refresh token and stored it, but no endpoint
 * ever accepted one, so every user was signed out 12 hours after logging in with
 * no way back. Both tokens are rotated on each use — a replayed refresh token is
 * therefore already unknown — and `refreshExpiresAt` caps the total session life
 * so refreshing cannot extend it forever.
 */
export async function refreshSession(refreshToken: string | null | undefined, ip?: string | null) {
  if (!refreshToken) throw Errors.invalidRefreshToken();

  const session = await prisma.userSession.findUnique({
    where: { refresh: refreshToken },
    include: {
      user: {
        include: { userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
      },
    },
  });
  if (!session) throw Errors.invalidRefreshToken();

  const now = new Date();
  // Legacy rows predate refreshExpiresAt; fall back to the access expiry so an
  // old session cannot be refreshed indefinitely.
  const refreshDeadline = session.refreshExpiresAt ?? session.expiresAt;
  const rejected =
    refreshDeadline < now || session.user.deletedAt !== null || session.user.status !== "ACTIVE";
  if (rejected) {
    await prisma.userSession.delete({ where: { id: session.id } }).catch(() => { });
    throw Errors.invalidRefreshToken();
  }

  const token = generateToken();
  const refresh = generateToken();
  const expiresAt = sessionExpiry();
  await prisma.userSession.update({
    where: { id: session.id },
    // refreshExpiresAt is deliberately not extended — it is an absolute cap.
    data: { token, refresh, expiresAt, ip: ip ?? session.ip },
  });

  return { user: publicUser(session.user), token, refresh, expiresAt: expiresAt.toISOString() };
}

/**
 * Deletes sessions whose expiry has passed. Previously a session row was only
 * removed if that exact token was presented again after expiring, so abandoned
 * sessions accumulated forever. Called on an interval from server.ts.
 *
 * A session is only dead once its refresh window has closed too, otherwise the
 * sweep would delete rows that POST /auth/refresh could still legitimately use.
 */
export async function purgeExpiredSessions(): Promise<number> {
  const now = new Date();
  const { count } = await prisma.userSession.deleteMany({
    where: {
      OR: [
        { refreshExpiresAt: { lt: now } },
        { refreshExpiresAt: null, expiresAt: { lt: now } },
      ],
    },
  });
  return count;
}

export async function resolveSession(token: string | null | undefined) {
  if (!token) return null;
  const session = await prisma.userSession.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        },
      },
    },
  });
  if (!session) return null;

  const now = new Date();
  const userGone = session.user.deletedAt !== null || session.user.status !== "ACTIVE";
  const refreshDeadline = session.refreshExpiresAt ?? session.expiresAt;

  // An expired access token is not authenticated, but the row must survive so
  // POST /auth/refresh can still rotate it. Only drop the row once the refresh
  // window has closed as well, or the account is no longer usable.
  if (userGone || refreshDeadline < now) {
    await prisma.userSession.delete({ where: { id: session.id } }).catch(() => { });
    return null;
  }
  if (session.expiresAt < now) return null;

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

export async function changePassword(userId: string, currentPassword: string, newPassword: string, currentToken?: string, ip?: string | null) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Errors.notFound("User");
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw Errors.invalidCredentials();
  const { hashPassword } = await import("../utils/crypto");
  const hash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
  await prisma.userSession.deleteMany({
    where: currentToken ? { userId, token: { not: currentToken } } : { userId },
  });
  await recordAudit({ ctx: { userId, ip }, action: "PASSWORD_CHANGED", module: "auth", entity: "user", entityId: userId });
  return true;
}
