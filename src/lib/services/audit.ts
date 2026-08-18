import { db } from "@/lib/db";

export type AuditContext = {
  userId?: string | null;
  ipAddress?: string | null;
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
  ctx,
  action,
  module,
  entity,
  entityId,
  oldValue,
  newValue,
  description,
}: AuditParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: ctx?.userId ?? null,
        action,
        module,
        entity: entity ?? null,
        entityId: entityId ?? null,
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        ipAddress: ctx?.ipAddress ?? null,
        description: description ?? null,
      },
    });
  } catch (e) {
    // Audit failures must NEVER crash the parent transaction.
    // Logged to stderr; in production these would route to a dedicated sink.
    console.error("[audit] failed to record audit log", e);
  }
}
