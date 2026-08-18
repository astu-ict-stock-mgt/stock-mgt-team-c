"use client";

import {
  Package,
  DollarSign,
  AlertTriangle,
  PackageX,
  Truck,
  Warehouse as WarehouseIcon,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertOctagon,
  Archive,
  Clock,
  FileText,
  PackageCheck,
  ShieldAlert,
  ShieldCheck,
  LogOut,
  FolderTree,
  LayoutDashboard,
} from "lucide-react";
import { type ReactNode } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from "recharts";
import { useDashboard } from "@/lib/api/hooks";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionError, SectionLoading, AstuAction, StatCard, StatusPill, type StatTone } from "@/components/app/section-utils";
import { useUIStore } from "@/stores/ui-store";
import { formatCurrency, formatCurrencyCompact, formatCompact, formatNumber, formatRelative, statusColor } from "@/lib/utils/format";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Package, DollarSign, AlertTriangle, PackageX, Truck, Warehouse: WarehouseIcon,
  ArrowDownToLine, ArrowUpFromLine, AlertOctagon, Archive, Clock, FileText, PackageCheck,
  ShieldAlert, ShieldCheck, LogOut, FolderTree, LayoutDashboard,
};

// KPI variant → StatCard tone
const KPI_TONE: Record<string, StatTone> = {
  default: "primary",
  warning: "warning",
  danger: "danger",
  muted: "neutral",
  success: "success",
  info: "info",
};

// Pie slice colors keyed to chart tokens
const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "var(--chart-3)",
  LOW_STOCK: "var(--chart-4)",
  OUT_OF_STOCK: "var(--chart-5)",
  DAMAGED: "var(--chart-5)",
  OBSOLETE: "var(--muted-foreground)",
  DISPOSED: "var(--border)",
  RESERVED: "var(--chart-1)",
};

export function DashboardSection() {
  const { data, isLoading, isError, refetch } = useDashboard();
  const setSection = useUIStore((s) => s.setSection);

  if (isLoading) return <SectionLoading label="Loading dashboard..." />;
  if (isError || !data) return <SectionError message="Failed to load dashboard" onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Dashboard — ${data.role === "DEPARTMENT_HEAD" ? data.department ?? "Department" : roleLabel(data.role)}`}
        description="Real-time inventory overview with role-aware KPIs and recent activity"
        icon={LayoutDashboard}
      />

      {/* KPIs */}
      {data.kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {data.kpis.map((kpi) => (
            <StatCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.format === "currency" ? formatCurrencyCompact(kpi.value) : formatCompact(kpi.value)}
              icon={ICONS[kpi.icon] ?? Package}
              tone={KPI_TONE[kpi.variant ?? "default"] ?? "primary"}
            />
          ))}
        </div>
      )}

      {/* Charts — the 30-day trend leads full-width; breakdowns sit beneath it */}
      {data.charts && (
        <div className="space-y-4">
          {data.charts.movement && data.charts.movement.length > 0 && (
            <ChartCard title="30-Day Stock Movement" icon={Clock} tall>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts.movement.map((m) => ({
                  date: new Date(m.date as string).toLocaleDateString(),
                  Receipts: m.type === "RECEIPT" ? Math.abs(m.quantity as number) : 0,
                  Issues: m.type === "ISSUE" ? Math.abs(m.quantity as number) : 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--accent)", opacity: 0.4 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Receipts" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Issues" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.charts.inventoryByStatus && data.charts.inventoryByStatus.length > 0 && (
              <ChartCard title="Inventory by Status" icon={Package}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.charts.inventoryByStatus.map((d) => ({ name: d.label, value: d.value }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={84}
                      paddingAngle={2}
                      stroke="var(--card)"
                      strokeWidth={2}
                    >
                      {data.charts.inventoryByStatus.map((d) => (
                        <Cell key={d.label} fill={STATUS_COLORS[d.label] ?? "var(--muted-foreground)"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {data.charts.stockValueByCategory && data.charts.stockValueByCategory.length > 0 && (
              <ChartCard title="Stock Value by Category" icon={FolderTree}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.stockValueByCategory.map((d) => ({ name: d.label, value: d.value }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--accent)", opacity: 0.4 }} />
                    <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {data.charts.stockValueByWarehouse && data.charts.stockValueByWarehouse.length > 0 && (
              <ChartCard title="Stock Value by Warehouse" icon={WarehouseIcon}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.stockValueByWarehouse.map((d) => ({ name: d.label, value: d.value }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--accent)", opacity: 0.4 }} />
                    <Bar dataKey="value" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="columns-1 gap-4 lg:columns-2">
        {data.recentTransactions && data.recentTransactions.length > 0 && (
          <ActivityCard title="Recent Transactions" icon={ArrowDownToLine} tone="primary" footer={<AstuAction onClick={() => setSection("audit-logs")}>View Audit Logs →</AstuAction>}>
            <table className="astu-table">
              <thead>
                <tr><th>Type</th><th>Item</th><th className="text-right">Qty</th><th>When</th></tr>
              </thead>
              <tbody>
                {data.recentTransactions.slice(0, 8).map((t: Record<string, any>) => (
                  <tr key={t.id}>
                    <td><Badge variant={statusColor(t.type)} className="text-[10px] font-mono">{t.type}</Badge></td>
                    <td className="text-xs">
                      <div className="font-medium">{t.item ?? "—"}</div>
                      <div className="text-[10px] text-muted-foreground">{t.user ?? "system"}</div>
                    </td>
                    <td className="text-right font-semibold">{formatNumber(Math.abs(t.quantity))}</td>
                    <td className="text-[10px] text-muted-foreground whitespace-nowrap">{formatRelative(t.transactionDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ActivityCard>
        )}

        {data.recentReceipts && data.recentReceipts.length > 0 && (
          <ActivityCard title="Recent Receipts" icon={ArrowDownToLine} tone="success" footer={<AstuAction onClick={() => setSection("receipts")}>View All Receipts →</AstuAction>}>
            <table className="astu-table">
              <thead>
                <tr><th>Code</th><th>Supplier</th><th className="text-right">Amount</th><th className="text-right">Qty</th></tr>
              </thead>
              <tbody>
                {data.recentReceipts.slice(0, 8).map((r: Record<string, any>) => (
                  <tr key={r.id}>
                    <td className="font-mono text-[11px]">{r.code}</td>
                    <td className="text-xs">
                      <div className="font-medium truncate max-w-[120px]">{r.supplier ?? "—"}</div>
                      <div className="text-[10px] text-muted-foreground">{r.warehouse}</div>
                    </td>
                    <td className="text-right font-semibold text-xs">{formatCurrency(r.totalAmount)}</td>
                    <td className="text-right text-xs">{formatNumber(r.totalQuantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ActivityCard>
        )}

        {data.recentIssues && data.recentIssues.length > 0 && data.role !== "DEPARTMENT_HEAD" && (
          <ActivityCard title="Recent Issues" icon={ArrowUpFromLine} tone="danger" footer={<AstuAction onClick={() => setSection("issues")}>View All Issues →</AstuAction>}>
            <table className="astu-table">
              <thead>
                <tr><th>Code</th><th>Department</th><th className="text-right">COGS</th><th className="text-right">Qty</th></tr>
              </thead>
              <tbody>
                {data.recentIssues.slice(0, 8).map((i: Record<string, any>) => (
                  <tr key={i.id}>
                    <td className="font-mono text-[11px]">{i.code}</td>
                    <td className="text-xs">
                      <div className="font-medium">{i.department}</div>
                      <div className="text-[10px] text-muted-foreground">{i.warehouse}</div>
                    </td>
                    <td className="text-right font-semibold text-xs">{formatCurrency(i.totalCogs)}</td>
                    <td className="text-right text-xs">{formatNumber(i.totalQuantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ActivityCard>
        )}

        {data.warehouseStock && data.warehouseStock.length > 0 && (
          <ActivityCard title="Warehouse Stock Snapshot" icon={WarehouseIcon} tone="primary" footer={<AstuAction onClick={() => setSection("inventory")}>View Inventory →</AstuAction>}>
            <table className="astu-table">
              <thead>
                <tr><th>Item</th><th>Warehouse</th><th className="text-right">Qty</th></tr>
              </thead>
              <tbody>
                {data.warehouseStock.slice(0, 8).map((ws: Record<string, any>) => (
                  <tr key={ws.id}>
                    <td className="text-xs">
                      <div className="font-medium">{ws.itemName}</div>
                      <div className="text-[10px] text-muted-foreground">{ws.itemCode}</div>
                    </td>
                    <td className="text-xs">{ws.warehouse}</td>
                    <td className="text-right font-semibold">{formatNumber(ws.quantity)} <span className="text-[10px] text-muted-foreground">{ws.uom}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ActivityCard>
        )}

        {data.recentGatePasses && data.recentGatePasses.length > 0 && (
          <ActivityCard title="Recent Gate Passes" icon={ShieldCheck} tone="neutral">
            <table className="astu-table">
              <thead>
                <tr><th>Code</th><th>Status</th><th>Requested By</th><th>When</th></tr>
              </thead>
              <tbody>
                {data.recentGatePasses.slice(0, 8).map((g: Record<string, any>) => (
                  <tr key={g.id}>
                    <td className="font-mono text-[11px]">{g.code}</td>
                    <td><StatusPill status={g.status} /></td>
                    <td className="text-xs">{g.requestedBy}</td>
                    <td className="text-[10px] text-muted-foreground">{formatRelative(g.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ActivityCard>
        )}

        {data.role !== "DEPARTMENT_HEAD" && data.recentRequisitions && data.recentRequisitions.length > 0 && (
          <ActivityCard title="My Recent Requisitions" icon={FileText} tone="info">
            <table className="astu-table">
              <thead>
                <tr><th>Code</th><th>Status</th><th className="text-right">Items</th><th>Required</th></tr>
              </thead>
              <tbody>
                {data.recentRequisitions.slice(0, 8).map((r: Record<string, any>) => (
                  <tr key={r.id}>
                    <td className="font-mono text-[11px]">{r.code}</td>
                    <td><StatusPill status={r.status} /></td>
                    <td className="text-right text-xs">{r.itemCount}</td>
                    <td className="text-[10px] text-muted-foreground">{formatRelative(r.requiredDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ActivityCard>
        )}

        {data.role === "DEPARTMENT_HEAD" && data.recentIssues && data.recentIssues.length > 0 && (
          <ActivityCard title="Received Stock" icon={ArrowUpFromLine} tone="danger">
            <table className="astu-table">
              <thead>
                <tr><th>Code</th><th>Warehouse</th><th className="text-right">COGS</th><th className="text-right">Qty</th></tr>
              </thead>
              <tbody>
                {data.recentIssues.slice(0, 8).map((issue: Record<string, any>) => (
                  <tr key={issue.id}>
                    <td className="font-mono text-[11px]">{issue.code}</td>
                    <td className="text-xs">
                      <div className="font-medium">{issue.warehouse ?? "—"}</div>
                      <div className="text-[10px] text-muted-foreground">{issue.department}</div>
                    </td>
                    <td className="text-right font-semibold text-xs">{formatCurrency(issue.totalCogs)}</td>
                    <td className="text-right text-xs">{formatNumber(issue.totalQuantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ActivityCard>
        )}
      </div>
    </div>
  );
}

const TOOLTIP_STYLE = {
  borderRadius: "8px",
  border: "1px solid var(--border)",
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  fontSize: "12px",
  boxShadow: "var(--shadow-pop)",
} as const;

const ACTIVITY_TONE: Record<string, { chip: string }> = {
  primary: { chip: "bg-accent text-primary" },
  success: { chip: "bg-success-subtle text-success-strong" },
  danger: { chip: "bg-danger-subtle text-danger-strong" },
  info: { chip: "bg-info-subtle text-info-strong" },
  neutral: { chip: "bg-surface-2 text-muted-foreground" },
};

function ChartCard({ title, icon: Icon, children, tall = false }: { title: string; icon: React.ComponentType<{ className?: string }>; children: ReactNode; tall?: boolean }) {
  return (
    <div className="astu-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className={`p-4 ${tall ? "h-80" : "h-72"}`}>{children}</div>
    </div>
  );
}

function ActivityCard({
  title,
  icon: Icon,
  tone,
  children,
  footer,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof ACTIVITY_TONE;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="astu-card mb-4 flex break-inside-avoid flex-col overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${ACTIVITY_TONE[tone].chip}`}>
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="overflow-x-auto flex-1">{children}</div>
      {footer && <div className="border-t border-border bg-surface/60 px-4 py-2 text-right">{footer}</div>}
    </div>
  );
}

function roleLabel(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
