// UI helpers for formatting + display.

export function formatCurrency(value: number, currency = "ETB"): string {
  if (!Number.isFinite(value)) return "—";
  return `${currency} ${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

/** Compact currency for glanceable KPI tiles — never overflows the card (e.g. "ETB 145.7M"). */
export function formatCurrencyCompact(value: number, currency = "ETB"): string {
  if (!Number.isFinite(value)) return "—";
  const opts: Intl.NumberFormatOptions =
    Math.abs(value) >= 1_000_000
      ? { notation: "compact", maximumFractionDigits: 1 }
      : { maximumFractionDigits: 0 };
  return `${currency} ${value.toLocaleString("en-US", opts)}`;
}

/** Compact number for KPI tiles (e.g. "1.2M"); grouped integer below 1M. */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const opts: Intl.NumberFormatOptions =
    Math.abs(value) >= 1_000_000
      ? { notation: "compact", maximumFractionDigits: 1 }
      : { maximumFractionDigits: 0 };
  return value.toLocaleString("en-US", opts);
}

export function formatNumber(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: fractionDigits });
}

export function formatDate(value: string | Date | null, withTime = false): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  const date = d.toISOString().slice(0, 10);
  if (!withTime) return date;
  const time = d.toISOString().slice(11, 19);
  return `${date} ${time} UTC`;
}

export function formatRelative(value: string | Date | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d);
}

export function statusColor(status: string): string {
  const s = status.toUpperCase();
  if (["ACTIVE", "CONFIRMED", "COMPLETED", "APPROVED", "FULFILLED"].includes(s)) return "default";
  if (["LOW_STOCK", "PENDING", "PENDING_APPROVAL", "SUBMITTED", "IN_PROGRESS", "INSPECTING", "IN_TRANSIT", "DRAFT"].includes(s)) return "secondary";
  if (["OUT_OF_STOCK", "REJECTED", "CANCELLED", "LOCKED", "BLACKLISTED", "INACTIVE", "DISPOSED"].includes(s)) return "destructive";
  if (["DAMAGED", "OBSOLETE", "REPORTED"].includes(s)) return "destructive";
  if (["EXIT_CONFIRMED"].includes(s)) return "default";
  return "secondary";
}

export function roleDisplayName(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
