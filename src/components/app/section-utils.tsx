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
    <div className="mb-6 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-primary ring-1 ring-inset ring-border">
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-[20px] font-semibold leading-tight text-foreground sm:text-[22px]">{title}</h1>
          {description && (
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex shrink-0 items-center gap-2 sm:self-start">{action}</div>
      )}
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
      <div className="inline-flex min-w-full items-center gap-1 rounded-lg border border-border bg-surface-2 p-1 sm:min-w-0">
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

/* ------------------------------------------------------------------ *
 * Skeleton primitives
 * ------------------------------------------------------------------ */

/** One stat-card skeleton — matches the exact shape of <StatCard />. */
export function StatCardSkeleton() {
  return (
    <div className="astu-card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-2.5 w-20 rounded" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <Skeleton className="h-7 w-24 rounded" />
      <Skeleton className="h-2 w-16 rounded" />
    </div>
  );
}

/** A grid of stat-card skeletons. Defaults to 4 items, 4-col on lg. */
export function StatCardSkeletonGrid({
  count = 4,
  cols = "grid-cols-2 md:grid-cols-4",
}: {
  count?: number;
  cols?: string;
}) {
  return (
    <div className={cn("grid gap-4", cols)}>
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Table rows skeleton — renders inside an <AstuCardTable>. */
export function TableSkeleton({
  rows = 8,
  cols = 6,
  toolbar = false,
}: {
  rows?: number;
  cols?: number;
  toolbar?: boolean;
}) {
  return (
    <div className="astu-card overflow-hidden">
      {toolbar && (
        <div className="border-b border-border bg-surface px-4 py-3">
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="astu-table">
          <thead>
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i}>
                  <Skeleton className="h-2.5 w-16 rounded" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c}>
                    <Skeleton
                      className={cn(
                        "rounded",
                        c === 0 ? "h-3 w-20" : c === 1 ? "h-3 w-28" : "h-3 w-14"
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border bg-surface px-4 py-2.5">
        <Skeleton className="h-3 w-32 rounded" />
        <div className="flex gap-1.5">
          <Skeleton className="h-7 w-20 rounded" />
          <Skeleton className="h-7 w-16 rounded" />
          <Skeleton className="h-7 w-20 rounded" />
        </div>
      </div>
    </div>
  );
}

/** Form skeleton — two-col grid of label+input pairs. */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-2.5 w-16 rounded" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
    </div>
  );
}

/** Chart card skeleton — header bar + chart body. */
export function ChartSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div className="astu-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-3 w-32 rounded" />
      </div>
      <div className={cn("p-4", tall ? "h-80" : "h-72")}>
        <div className="flex h-full items-end gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t"
              style={{ height: `${30 + ((i * 17 + 23) % 70)}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Activity card skeleton — matches the dashboard ActivityCard. */
export function ActivityCardSkeleton() {
  return (
    <div className="astu-card mb-4 overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <Skeleton className="h-7 w-7 rounded-md" />
        <Skeleton className="h-3 w-28 rounded" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2.5">
            <div className="space-y-1">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-2 w-16 rounded" />
            </div>
            <Skeleton className="h-3 w-14 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Store card skeleton — matches the stores grid card shape. */
export function StoreCardSkeleton() {
  return (
    <div className="astu-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-9 rounded-md shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-2 w-16 rounded" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="p-4">
        <Skeleton className="mb-3 h-2 w-32 rounded" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-16 rounded-md" />
          <Skeleton className="h-16 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * SectionLoading — now accepts a variant that picks the right skeleton
 * shape. Falls back to the original generic layout for "default".
 * ------------------------------------------------------------------ */
export type SectionLoadingVariant =
  | "default"          // original: 4 stat skeletons + toolbar + big table block
  | "table"            // filter bar + table rows
  | "table-with-stats" // stat grid + table rows
  | "dashboard"        // stat grid + full-width chart + 2-col activity cards
  | "stores"           // card grid (store cards)
  | "roles"            // card list (role cards)
  | "settings";        // single form card

export function SectionLoading({
  label = "Loading...",
  variant = "default",
}: {
  label?: string;
  variant?: SectionLoadingVariant;
}) {
  if (variant === "table") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[52px] w-full rounded-md" />
        <TableSkeleton rows={10} cols={7} />
      </div>
    );
  }

  if (variant === "table-with-stats") {
    return (
      <div className="space-y-4">
        <StatCardSkeletonGrid />
        <Skeleton className="h-[52px] w-full rounded-md" />
        <TableSkeleton rows={8} cols={7} />
      </div>
    );
  }

  if (variant === "dashboard") {
    return (
      <div className="space-y-6">
        {/* KPI row */}
        <StatCardSkeletonGrid count={4} />
        {/* Full-width chart */}
        <ChartSkeleton tall />
        {/* 2-col chart row */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        {/* Activity cards */}
        <div className="columns-1 gap-4 lg:columns-2">
          <ActivityCardSkeleton />
          <ActivityCardSkeleton />
          <ActivityCardSkeleton />
          <ActivityCardSkeleton />
        </div>
      </div>
    );
  }

  if (variant === "stores") {
    return (
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <StoreCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (variant === "roles") {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="astu-card overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-border bg-surface/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-3 w-28 rounded" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="border-l-2 border-primary/30 pl-3">
                  <Skeleton className="mb-2 h-2 w-20 rounded" />
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: 5 }).map((_, k) => (
                      <Skeleton key={k} className="h-6 w-16 rounded" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "settings") {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="astu-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
          <div className="p-5">
            <FormSkeleton fields={6} />
          </div>
        </div>
      </div>
    );
  }

  // "default" — original generic layout, unchanged
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

/**
 * EmptyState — the canonical zero-data UI block.
 * Dashed border card, centered icon bubble, title, optional description,
 * optional primary action button.
 *
 * Use `tone` to match the section's semantic color (default is neutral).
 */
export type EmptyStateTone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const EMPTY_ICON_TONE: Record<EmptyStateTone, string> = {
  neutral: "bg-surface-2 text-muted-foreground",
  primary: "bg-accent text-primary",
  success: "bg-success-subtle text-success-strong",
  warning: "bg-warning-subtle text-warning-strong",
  danger: "bg-danger-subtle text-danger-strong",
  info: "bg-info-subtle text-info-strong",
};

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  tone = "neutral",
  action,
  actionLabel,
  onAction,
  size = "md",
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: EmptyStateTone;
  /** Pass a full ReactNode for total control, or use actionLabel+onAction for a simple button. */
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  size?: "sm" | "md" | "lg";
}) {
  const padding = size === "sm" ? "p-8" : size === "lg" ? "p-16" : "p-12";
  const iconSize = size === "sm" ? "h-9 w-9" : "h-12 w-12";
  const iconInner = size === "sm" ? "h-4 w-4" : "h-6 w-6";

  const resolvedAction =
    action ??
    (actionLabel && onAction ? (
      <Button size="sm" variant="outline" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null);

  return (
    <div
      className={cn(
        "rounded-md border border-dashed border-border-strong bg-card text-center",
        padding
      )}
    >
      <span
        className={cn(
          "mx-auto flex shrink-0 items-center justify-center rounded-full",
          iconSize,
          EMPTY_ICON_TONE[tone]
        )}
      >
        <Icon className={iconInner} />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {resolvedAction && <div className="mt-5">{resolvedAction}</div>}
    </div>
  );
}

/**
 * SectionEmpty — backward-compatible alias for EmptyState.
 * Existing call-sites keep working; new code should use EmptyState directly.
 */
export function SectionEmpty({
  title,
  message,
  action,
  icon,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <EmptyState
      title={title}
      description={message}
      action={action}
      icon={icon}
    />
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

/* ------------------------------------------------------------------ *
 * MobileCard — renders a single data record as a card on narrow screens.
 *
 * Usage:
 *   <MobileCard
 *     primary="Dell Latitude 5520"
 *     secondary="IT-LP-001"
 *     badge={<StatusPill status="AVAILABLE" />}
 *     meta={[
 *       { label: "Qty",   value: "24" },
 *       { label: "Value", value: "ETB 120,000" },
 *     ]}
 *     action={<AstuAction onClick={...}>View</AstuAction>}
 *   />
 * ------------------------------------------------------------------ */
export function MobileCard({
  primary,
  secondary,
  badge,
  meta,
  action,
  onClick,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  badge?: ReactNode;
  meta?: Array<{ label: string; value: ReactNode }>;
  action?: ReactNode;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "flex w-full flex-col gap-2 border-b border-border bg-card px-4 py-3 last:border-b-0 text-left",
        onClick && "hover:bg-surface-2 transition-colors active:bg-surface-2"
      )}
    >
      {/* Header row: primary text + optional badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{primary}</p>
          {secondary && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{secondary}</p>
          )}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {/* Meta grid — up to 4 label/value pairs */}
      {meta && meta.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {meta.map(({ label, value }) => (
            <div key={label} className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="truncate text-xs font-semibold tabular text-foreground">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Action row */}
      {action && (
        <div className="flex items-center justify-end pt-0.5">{action}</div>
      )}
    </Comp>
  );
}

/* ------------------------------------------------------------------ *
 * ResponsiveTable — the DRY mobile/desktop table pattern.
 *
 * - On screens ≥ sm (640px): renders the standard <table> inside
 *   AstuCardTable, exactly as before.
 * - On screens < sm: renders the `mobileCards` ReactNode instead —
 *   typically an array of <MobileCard /> elements — wrapped in the
 *   same astu-card container so borders and shadow match.
 *
 * Usage:
 *   <ResponsiveTable
 *     toolbar={<FilterBar />}
 *     footerAction={<AstuAction>+ New</AstuAction>}
 *     mobileCards={data.items.map(item => (
 *       <MobileCard key={item.id} primary={item.name} ... />
 *     ))}
 *   >
 *     <table className="astu-table">...</table>
 *     <Pagination ... />
 *   </ResponsiveTable>
 * ------------------------------------------------------------------ */
export function ResponsiveTable({
  children,
  mobileCards,
  toolbar,
  footerAction,
  title,
}: {
  children: ReactNode;           // table + Pagination (shown sm+)
  mobileCards: ReactNode;        // MobileCard list (shown <sm)
  toolbar?: ReactNode;
  footerAction?: ReactNode;
  title?: string;
}) {
  return (
    <>
      {/* ── Mobile card list (< sm) ── */}
      <div className="sm:hidden">
        <div className="astu-card overflow-hidden">
          {title && (
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            </div>
          )}
          {toolbar && (
            <div className="border-b border-border bg-surface px-4 py-3">{toolbar}</div>
          )}
          <div>{mobileCards}</div>
          {footerAction && (
            <div className="flex items-center justify-end border-t border-border bg-surface px-4 py-2.5">
              {footerAction}
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop table (sm+) ── */}
      <div className="hidden sm:block">
        <AstuCardTable title={title} toolbar={toolbar} footerAction={footerAction}>
          {children}
        </AstuCardTable>
      </div>
    </>
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
