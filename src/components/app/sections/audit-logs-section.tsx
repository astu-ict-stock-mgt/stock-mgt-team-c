"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { ScrollText } from "lucide-react";
import { useAuditLogs } from "@/lib/api/hooks";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader, SectionError, SectionLoading, EmptyState, MobileCard } from "@/components/app/section-utils";
import { formatRelative, formatDate } from "@/lib/utils/format";
import { useUIStore } from "@/stores/ui-store";
import type { AuditLog } from "@/lib/types";

export function AuditLogsSection() {
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch]     = useState("");
  const [module, setModule]     = useState("");

  const notificationTarget    = useUIStore((s) => s.notificationTarget);
  const setNotificationTarget = useUIStore((s) => s.setNotificationTarget);

  const { data, isLoading, isError, refetch } = useAuditLogs({
    page,
    limit: pageSize,
    search: search || undefined,
    module: module || undefined,
  });

  /* eslint-disable react-hooks/set-state-in-effect */
  /* Handle deep-link from notification bell */
  useLayoutEffect(() => {
    const filters: Record<string, string> = {
      "gate-pass":    "GATE_PASS",
      "stock-take":   "STOCK_TAKE",
      "failed-login": "LOGIN_FAILED",
    };
    if (!notificationTarget || !filters[notificationTarget]) return;
    setSearch(filters[notificationTarget]);
    setModule("");
    setPage(1);
  /* eslint-enable react-hooks/set-state-in-effect */
    setNotificationTarget(null);
  }, [notificationTarget, setNotificationTarget]);

  /* ── Column definitions ─────────────────────────────────────────── */
  const columns = useMemo<ColumnDef<AuditLog, unknown>[]>(() => [
    {
      id: "action",
      accessorKey: "action",
      header: "Action",
      meta: { label: "Action" },
      cell: ({ getValue }) => (
        <Badge variant="secondary" className="font-mono text-[10px]">
          {getValue() as string}
        </Badge>
      ),
      size: 130,
    },
    {
      id: "module",
      accessorKey: "module",
      header: "Module",
      meta: { label: "Module" },
      cell: ({ getValue }) => (
        <span className="text-xs font-medium capitalize">{getValue() as string}</span>
      ),
      size: 110,
    },
    {
      id: "entity",
      header: "Entity",
      meta: { label: "Entity" },
      enableSorting: false,
      accessorFn: (row) =>
        row.entity
          ? `${row.entity}${row.entityId ? ` · ${row.entityId.slice(-8)}` : ""}`
          : "—",
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">{getValue() as string}</span>
      ),
    },
    {
      id: "user",
      header: "User",
      meta: { label: "User" },
      enableSorting: false,
      accessorFn: (row) => row.user?.fullName ?? "system",
      cell: ({ getValue }) => <span className="text-xs">{getValue() as string}</span>,
      size: 130,
    },
    {
      id: "description",
      accessorKey: "description",
      header: "Description",
      meta: { label: "Description" },
      enableSorting: false,
      cell: ({ getValue }) => (
        <span
          className="block max-w-[220px] truncate text-xs"
          title={(getValue() as string | null) ?? ""}
        >
          {(getValue() as string | null) ?? "—"}
        </span>
      ),
    },
    {
      id: "ipAddress",
      accessorKey: "ipAddress",
      header: "IP",
      meta: { label: "IP Address" },
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="font-mono text-xs">{(getValue() as string | null) ?? "—"}</span>
      ),
      size: 120,
    },
    {
      id: "timestamp",
      accessorKey: "timestamp",
      header: "Timestamp",
      meta: { label: "Timestamp" },
      cell: ({ getValue }) => (
        <span
          className="whitespace-nowrap text-xs"
          title={formatDate(getValue() as string, true)}
        >
          {formatRelative(getValue() as string)}
        </span>
      ),
      size: 140,
    },
  ], []);

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Immutable record of every important system mutation"
        icon={ScrollText}
      />

      {/* Module filter — DataTable owns the text search */}
      <div className="mb-3 flex flex-wrap gap-2">
        <Select
          value={module || "ALL"}
          onValueChange={(v) => { setModule(v === "ALL" ? "" : v); setPage(1); }}
        >
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="All Modules" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Modules</SelectItem>
            <SelectItem value="auth">Auth</SelectItem>
            <SelectItem value="users">Users</SelectItem>
            <SelectItem value="suppliers">Suppliers</SelectItem>
            <SelectItem value="categories">Categories</SelectItem>
            <SelectItem value="stores">Stores</SelectItem>
            <SelectItem value="inventory">Inventory</SelectItem>
            <SelectItem value="receipts">Receipts</SelectItem>
            <SelectItem value="issues">Issues</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <SectionLoading variant="table" />
      ) : isError ? (
        <SectionError message="Failed to load audit logs" onRetry={() => refetch()} />
      ) : !data ? null : data.total === 0 && !search && !module ? (
        <EmptyState
          icon={ScrollText}
          title="No audit logs yet"
          description="Every create, update, and delete action in the system is recorded here automatically."
        />
      ) : (
        <>
          {/* ── Mobile card list (< sm) ── */}
          <div className="sm:hidden astu-card overflow-hidden">
            {data.items.map((a) => (
              <MobileCard
                key={a.id}
                primary={a.description ?? a.action}
                secondary={`${a.module}${a.entity ? ` · ${a.entity}` : ""}`}
                badge={
                  <span className="inline-flex items-center rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground ring-1 ring-inset ring-border">
                    {a.action}
                  </span>
                }
                meta={[
                  { label: "User", value: a.user?.fullName ?? "system" },
                  { label: "IP",   value: a.ipAddress ?? "—" },
                  { label: "When", value: formatRelative(a.timestamp) },
                ]}
              />
            ))}
          </div>

          {/* ── DataTable (sm+) ── */}
          <div className="hidden sm:block">
            <DataTable
              columns={columns}
              data={data.items}
              searchValue={search}
              onSearchChange={(v) => { setSearch(v); setPage(1); }}
              searchPlaceholder="Search action, module, description…"
              disableClientSearch
              manualPagination={{
                page,
                pageSize,
                total: data.total,
                onPage: setPage,
                onPageSize: (s) => { setPageSize(s); setPage(1); },
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
