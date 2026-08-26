import { prisma } from "../config/db";

/**
 * Who performed an action. Every service that writes an audit row takes this
 * shape and passes it straight through, so the caller only has to build it
 * once — see `actorOf()` in middleware/auth.ts.
 */
export type AuditContext = {
  userId?: string | null;
  ip?: string | null;
};

type AuditParams = {
  ctx?: AuditContext;
  action: string;
  module: string;
  entity?: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  description?: string;
};

export async function recordAudit({
  ctx, action, module, entity, entityId, oldValue, newValue, description,
}: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: ctx?.userId ?? null,
        action,
        module,
        entity: entity ?? null,
        entityId: entityId ?? null,
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        ipAddress: ctx?.ip ?? null,
        description: description ?? null,
      },
    });
  } catch (e) {
    console.error("[audit] failed to record audit log", e);
  }
}
