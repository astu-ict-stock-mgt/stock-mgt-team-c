"use client";

import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Inbox, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";

/**
 * Page header — typographic, not a colored bar. Title + description sit above
 * a hairline rule; the optional action renders as a normal button on the right.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 border-b border-border pb-4">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-primary ring-1 ring-inset ring-border">
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-semibold leading-tight text-foreground">{title}</h1>
          {description && (
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

/**
 * Segmented tab control (no underline). White active chip on a recessed track.
 */
export function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mb-5 overflow-x-auto">
      <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1">
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={cn(
                "whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-card text-foreground shadow-sm ring-1 ring-inset ring-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SectionLoading({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-md" />
        ))}
      </div>
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-64 w-full rounded-md" />
      <p className="text-center text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function SectionError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-md border border-danger/25 bg-danger-subtle p-8 text-center">
      <AlertCircle className="mx-auto h-9 w-9 text-danger" />
      <p className="mt-3 text-sm font-medium text-danger-strong">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function SectionEmpty({
  title,
  message,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-md border border-dashed border-border-strong bg-card p-12 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      {message && <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-foreground">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/**
 * DataTable wrapper: bordered card with optional toolbar.
 */
export function DataTableShell({ children, toolbar }: { children: ReactNode; toolbar?: ReactNode }) {
  return (
    <div className="astu-card overflow-hidden">
      {toolbar && <div className="border-b border-border bg-surface p-3">{toolbar}</div>}
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

/**
 * "Card with table" wrapper: optional title header + table body + footer bar.
 */
export function AstuCardTable({
  title,
  children,
  footerAction,
  toolbar,
}: {
  title?: string;
  children: ReactNode;
  footerAction?: ReactNode;
  toolbar?: ReactNode;
}) {
  return (
    <div className="astu-card overflow-hidden">
      {title && (
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
      )}
      {toolbar && <div className="border-b border-border bg-surface px-4 py-3">{toolbar}</div>}
      <div className="overflow-x-auto">{children}</div>
      {footerAction && (
        <div className="flex items-center justify-end border-t border-border bg-surface px-4 py-2.5">
          {footerAction}
        </div>
      )}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPage: (p: number) => void;
}) {
  if (total === 0) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return (
    <div className="flex items-center justify-between border-t border-border bg-surface px-4 py-2.5 text-xs text-muted-foreground">
      <span>
        Showing <span className="font-medium text-foreground">{start}–{end}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span>
      </span>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} className="h-7 px-2.5">
          Previous
        </Button>
        <span className="px-2 tabular">
          Page {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="h-7 px-2.5"
        >
          Next
        </Button>
      </div>
    </div>
  );
}

/**
 * Inline action (View / Edit / Delete / New …). A quiet ghost affordance —
 * color shift + soft hover background, never underlined.
 */
export function AstuAction({
  children,
  onClick,
  variant = "link",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "link" | "danger" | "primary";
}) {
  const tone =
    variant === "danger"
      ? "text-danger hover:text-danger-strong hover:bg-danger-subtle"
      : variant === "primary"
      ? "text-primary hover:text-primary-strong hover:bg-accent"
      : "text-link hover:text-link-hover hover:bg-surface-2";
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium transition-colors",
        tone
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * StatCard — KPI tile. Quiet by design: ink number, muted label, a small
 * tone-tinted icon. No colored slabs or left bars.
 * ------------------------------------------------------------------ */
export type StatTone = "primary" | "success" | "warning" | "danger" | "info" | "neutral";

const STAT_ICON: Record<StatTone, string> = {
  primary: "text-muted-foreground/70",
  success: "text-success",
  warning: "text-warning-strong",
  danger: "text-danger",
  info: "text-info",
  neutral: "text-muted-foreground/60",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  trend,
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: StatTone;
  trend?: { dir: "up" | "down"; value: string };
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "astu-card flex w-full min-w-0 flex-col gap-3 p-4 text-left",
        onClick && "astu-card-hover cursor-pointer"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon && <Icon className={cn("h-4 w-4 shrink-0", STAT_ICON[tone])} />}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[26px] font-semibold leading-none tabular text-foreground">{value}</p>
        {(hint || trend) && (
          <div className="mt-2 flex items-center gap-1.5">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-[11px] font-semibold",
                  trend.dir === "up" ? "text-success-strong" : "text-danger"
                )}
              >
                {trend.dir === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trend.value}
              </span>
            )}
            {hint && <span className="truncate text-[11px] text-muted-foreground">{hint}</span>}
          </div>
        )}
      </div>
    </Comp>
  );
}

/* ------------------------------------------------------------------ *
 * StatusPill — color-coded status label (maps common domain statuses)
 * ------------------------------------------------------------------ */
export type PillTone = "success" | "warning" | "danger" | "info" | "neutral" | "primary";

const PILL_TONES: Record<PillTone, string> = {
  success: "bg-success-subtle text-success-strong ring-success/25",
  warning: "bg-warning-subtle text-warning-strong ring-warning/30",
  danger: "bg-danger-subtle text-danger-strong ring-danger/25",
  info: "bg-info-subtle text-info-strong ring-info/25",
  primary: "bg-accent text-primary ring-primary/20",
  neutral: "bg-surface-2 text-muted-foreground ring-border",
};

// Domain status → tone. Falls back to neutral.
const STATUS_TONE_MAP: Record<string, PillTone> = {
  ACTIVE: "success", AVAILABLE: "success", CONFIRMED: "success", COMPLETED: "success",
  APPROVED: "success", FULFILLED: "success", RECONCILED: "success", EXIT_CONFIRMED: "success",
  DISPOSED: "neutral", INACTIVE: "neutral", CANCELLED: "neutral", DRAFT: "neutral", OBSOLETE: "neutral",
  LOW_STOCK: "warning", INSPECTING: "warning", PENDING: "warning", PENDING_APPROVAL: "warning",
  IN_PROGRESS: "warning", IN_TRANSIT: "warning", SUBMITTED: "info", PARTIALLY_FULFILLED: "warning",
  REPORTED: "warning",
  OUT_OF_STOCK: "danger", LOCKED: "danger", REJECTED: "danger", BLACKLISTED: "danger", DAMAGED: "danger",
};

export function StatusPill({
  status,
  tone,
  label,
  className,
}: {
  status?: string;
  tone?: PillTone;
  label?: string;
  className?: string;
}) {
  const resolved: PillTone = tone ?? (status ? STATUS_TONE_MAP[status.toUpperCase()] ?? "neutral" : "neutral");
  const text = label ?? (status ? status.replace(/_/g, " ") : "");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset",
        PILL_TONES[resolved],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {text.toLowerCase()}
    </span>
  );
}
