"use client";

import { useEffect, useState } from "react";
import { Search, ScrollText } from "lucide-react";
import { useAuditLogs } from "@/lib/api/hooks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, SectionError, SectionLoading, EmptyState, Pagination, AstuCardTable, ResponsiveTable, MobileCard } from "@/components/app/section-utils";
import { formatRelative, formatDate } from "@/lib/utils/format";
import { useUIStore } from "@/stores/ui-store";

export function AuditLogsSection() {
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("");
  const notificationTarget = useUIStore((s) => s.notificationTarget);
  const setNotificationTarget = useUIStore((s) => s.setNotificationTarget);
  const { data, isLoading, isError, refetch } = useAuditLogs({ page, limit, search: search || undefined, module: module || undefined });

  useEffect(() => {
    const filters: Record<string, string> = {
      "gate-pass": "GATE_PASS",
      "stock-take": "STOCK_TAKE",
      "failed-login": "LOGIN_FAILED",
    };
    if (!notificationTarget || !filters[notificationTarget]) return;
    setSearch(filters[notificationTarget]);
    setModule("");
    setPage(1);
    setNotificationTarget(null);
  }, [notificationTarget, setNotificationTarget]);

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Immutable record of every important system mutation"
        icon={ScrollText}
      />

      <Card className="mb-4 p-3 border border-border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="relative md:col-span-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 h-9" placeholder="Search by action, module, description..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={module || "ALL"} onValueChange={(v) => { setModule(v === "ALL" ? "" : v); setPage(1); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Module" /></SelectTrigger>
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
      </Card>

      {isLoading ? (
        <SectionLoading variant="table" />
      ) : isError ? (
        <SectionError message="Failed to load audit logs" onRetry={() => refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit logs yet"
          description="Every create, update, and delete action in the system is recorded here automatically."
          size="md"
        />
      ) : (
        <ResponsiveTable
          mobileCards={data.items.map((a) => (
            <MobileCard
              key={a.id}
              primary={a.description ?? a.action}
              secondary={`${a.module}${a.entity ? ` · ${a.entity}` : ""}`}
              badge={<span className="inline-flex items-center rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground ring-1 ring-inset ring-border">{a.action}</span>}
              meta={[
                { label: "User",      value: a.user?.fullName ?? "system" },
                { label: "IP",        value: a.ipAddress ?? "—" },
                { label: "When",      value: formatRelative(a.timestamp) },
              ]}
            />
          ))}
        >
          <table className="astu-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Module</th>
                <th>Entity</th>
                <th>User</th>
                <th>Description</th>
                <th>IP</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((a) => (
                <tr key={a.id}>
                  <td><Badge variant="secondary" className="text-[10px] font-mono">{a.action}</Badge></td>
                  <td className="text-xs font-medium">{a.module}</td>
                  <td className="text-xs text-muted-foreground">{a.entity ?? "—"}{a.entityId ? ` · ${a.entityId.slice(-8)}` : ""}</td>
                  <td className="text-xs">{a.user?.fullName ?? "system"}</td>
                  <td className="text-xs max-w-[200px] truncate">{a.description ?? "—"}</td>
                  <td className="text-xs font-mono">{a.ipAddress ?? "—"}</td>
                  <td className="text-xs whitespace-nowrap" title={formatDate(a.timestamp, true)}>{formatRelative(a.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPage={setPage} />
        </ResponsiveTable>
          )}
    </div>
  );
}
