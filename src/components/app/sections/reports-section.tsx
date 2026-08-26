"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { BarChart3, Package, Download } from "lucide-react";
import { PageHeader, SectionError, SectionLoading, EmptyState, Pagination, AstuCardTable, TabBar, ResponsiveTable, MobileCard, StatusPill } from "@/components/app/section-utils";
import { useInventoryReport, useValuationReport, useMovementReport, useCategoriesAndUoms, useStores, usePermissions, downloadReportCsv } from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import { formatCurrency, formatNumber, statusColor } from "@/lib/utils/format";
import { toast } from "sonner";

/**
 * CSV download for a report, with the exact filters currently on screen — so the
 * file always matches what the user is looking at.
 *
 * Hidden without reports.export rather than shown and refused. The movement and
 * audit histories are capped server-side; the response says whether it bit, and
 * that is passed on instead of handing over a partial file that looks complete.
 */
function ExportCsvButton({
  report, params, label = "Export CSV",
}: {
  report: "inventory" | "valuation" | "movement" | "audit";
  params: Record<string, string | boolean | undefined>;
  label?: string;
}) {
  const { can } = usePermissions();
  const [busy, setBusy] = useState(false);

  if (!can("reports.export")) return null;

  const onClick = async () => {
    setBusy(true);
    try {
      const result = await downloadReportCsv(report, params);
      if (result.truncated) {
        toast.warning(
          `${result.filename} holds the first ${formatNumber(result.rows)} of ${formatNumber(result.total)} rows — narrow the filters for the rest`
        );
      } else {
        toast.success(`${result.filename} — ${formatNumber(result.rows)} row(s)`);
      }
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" className="h-9" onClick={onClick} disabled={busy}>
      <Download className="h-3.5 w-3.5" /> {busy ? "Exporting..." : label}
    </Button>
  );
}

export function ReportsSection() {
  const [tab, setTab] = useState("inventory");
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Inventory valuation, stock movement, and audit reports"
        icon={BarChart3}
      />
      <TabBar
        tabs={[
          { id: "inventory", label: "Inventory" },
          { id: "valuation", label: "FIFO Valuation" },
          { id: "movement", label: "Movement" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "inventory" && <InventoryReportView />}
      {tab === "valuation" && <ValuationReportView />}
      {tab === "movement" && <MovementReportView />}
    </div>
  );
}

function InventoryReportView() {
  const cats = useCategoriesAndUoms();
  const stores = useStores();
  const [categoryId, setCategoryId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const { data, isLoading, isError, refetch } = useInventoryReport({ categoryId: categoryId || undefined, storeId: storeId || undefined, lowStockOnly });

  return (
    <div>
      <Card className="mb-4 p-3 border border-border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <Select value={categoryId || "ALL"} onValueChange={(v) => setCategoryId(v === "ALL" ? "" : v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {cats.data?.categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={storeId || "ALL"} onValueChange={(v) => setStoreId(v === "ALL" ? "" : v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Store" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Stores</SelectItem>
              {stores.data?.items.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            variant={lowStockOnly ? "default" : "outline"}
            onClick={() => setLowStockOnly((v) => !v)}
            className={`h-9 ${lowStockOnly ? "bg-primary hover:bg-primary-strong text-primary-foreground" : ""}`}
          >
            {lowStockOnly ? "Showing low stock only" : "Show low stock only"}
          </Button>
          <Button variant="outline" className="h-9" onClick={() => refetch()}>Refresh</Button>
          <ExportCsvButton report="inventory" params={{ categoryId, storeId, lowStockOnly }} />
        </div>
      </Card>

      {isLoading ? <SectionLoading variant="table" /> :
       isError ? <SectionError message="Failed to load report" onRetry={() => refetch()} /> :
       !data ? null : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <Stat label="Total Items" value={formatNumber(data.totalItems)} />
            <Stat label="Total Quantity" value={formatNumber(data.totalQuantity)} />
            <Stat label="Total Value" value={formatCurrency(data.totalValue)} color="text-primary" />
            <Stat label="Low Stock" value={formatNumber(data.lowStockCount)} color="text-warning-strong" />
            <Stat label="Out of Stock" value={formatNumber(data.outOfStockCount)} color="text-danger" />
          </div>
          {data.items.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No items match the current filters"
              description="Try removing some filters or selecting a different category or store."
              size="sm"
            />
          ) : (
            <ResponsiveTable
              mobileCards={data.items.map((it) => (
                <MobileCard
                  key={it.code}
                  primary={it.name}
                  secondary={it.code}
                  badge={<StatusPill status={it.status} />}
                  meta={[
                    { label: "Category", value: it.category },
                    { label: "Qty",      value: `${formatNumber(it.quantity)} ${it.uom}` },
                    { label: "Value",    value: formatCurrency(it.totalValue) },
                    { label: "Cost",     value: formatCurrency(it.unitCost) },
                  ]}
                />
              ))}
            >
              <table className="astu-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Unit Cost</th>
                    <th className="text-right">Value</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((it) => (
                    <tr key={it.code}>
                      <td className="font-mono text-xs">{it.code}</td>
                      <td className="font-medium text-sm">{it.name}</td>
                      <td className="text-xs">{it.category}</td>
                      <td className="text-right">{formatNumber(it.quantity)} {it.uom}</td>
                      <td className="text-right">{formatCurrency(it.unitCost)}</td>
                      <td className="text-right font-semibold text-primary">{formatCurrency(it.totalValue)}</td>
                      <td><Badge variant={statusColor(it.status)} className="text-[10px]">{it.status.replace(/_/g, " ")}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResponsiveTable>
          )}
        </>
      )}
    </div>
  );
}

function ValuationReportView() {
  const cats = useCategoriesAndUoms();
  const stores = useStores();
  const [categoryId, setCategoryId] = useState("");
  const [storeId, setStoreId] = useState("");
  const { data, isLoading, isError, refetch } = useValuationReport({ categoryId: categoryId || undefined, storeId: storeId || undefined });

  const chartData = (data?.items ?? []).slice(0, 10).map((i) => ({ name: i.code, value: i.totalValue }));

  return (
    <div>
      <Card className="mb-4 p-3 border border-border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Select value={categoryId || "ALL"} onValueChange={(v) => setCategoryId(v === "ALL" ? "" : v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {cats.data?.categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={storeId || "ALL"} onValueChange={(v) => setStoreId(v === "ALL" ? "" : v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Store" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Stores</SelectItem>
              {stores.data?.items.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-9" onClick={() => refetch()}>Refresh</Button>
          <ExportCsvButton report="valuation" params={{ categoryId, storeId }} />
        </div>
      </Card>

      {isLoading ? <SectionLoading variant="table" /> :
       isError ? <SectionError message="Failed" onRetry={() => refetch()} /> :
       !data ? null : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Stat label="Total Value" value={formatCurrency(data.totalValue)} color="text-primary" />
            <Stat label="Total Quantity" value={formatNumber(data.totalQuantity)} />
            <Stat label="Items" value={formatNumber(data.totalItems)} />
          </div>
          {chartData.length > 0 && (
            <Card className="mb-4 border border-border shadow-sm">
              <CardHeader className="bg-surface/60 border-b border-border py-2.5 px-4">
                <CardTitle className="text-sm font-semibold">Top 10 Items by Value</CardTitle>
              </CardHeader>
              <CardContent className="h-72 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={100} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--popover)", color: "var(--popover-foreground)", fontSize: "12px" }} cursor={{ fill: "var(--accent)", opacity: 0.4 }} />
                    <Bar dataKey="value" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          {data.items.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No items to value"
              description="No inventory items have stock value under the current filters."
              size="sm"
            />
          ) : (
            <ResponsiveTable
              mobileCards={data.items.map((it) => (
                <MobileCard
                  key={it.code}
                  primary={it.name}
                  secondary={it.code}
                  meta={[
                    { label: "Qty",    value: `${formatNumber(it.quantity)} ${it.uom}` },
                    { label: "Avg Cost", value: formatCurrency(it.avgUnitCost) },
                    { label: "Value",  value: formatCurrency(it.totalValue) },
                    { label: "Layers", value: String(it.fifoLayers) },
                  ]}
                />
              ))}
            >
              <table className="astu-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Avg Cost</th>
                    <th className="text-right">Total Value</th>
                    <th className="text-right">Layers</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((it) => (
                    <tr key={it.code}>
                      <td className="font-mono text-xs">{it.code}</td>
                      <td className="font-medium text-sm">{it.name}</td>
                      <td className="text-right">{formatNumber(it.quantity)} {it.uom}</td>
                      <td className="text-right">{formatCurrency(it.avgUnitCost)}</td>
                      <td className="text-right font-semibold text-primary">{formatCurrency(it.totalValue)}</td>
                      <td className="text-right text-xs">{it.fifoLayers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResponsiveTable>
          )}
        </>
      )}
    </div>
  );
}

function MovementReportView() {
  const stores = useStores();
  const [storeId, setStoreId] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const limit = 30;
  const { data, isLoading, isError, refetch } = useMovementReport({ page, limit, storeId: storeId || undefined, type: type || undefined });

  return (
    <div>
      <Card className="mb-4 p-3 border border-border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Select value={storeId || "ALL"} onValueChange={(v) => { setStoreId(v === "ALL" ? "" : v); setPage(1); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Store" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Stores</SelectItem>
              {stores.data?.items.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={type || "ALL"} onValueChange={(v) => { setType(v === "ALL" ? "" : v); setPage(1); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="RECEIPT">Receipt</SelectItem>
              <SelectItem value="ISSUE">Issue</SelectItem>
              <SelectItem value="TRANSFER_IN">Transfer In</SelectItem>
              <SelectItem value="TRANSFER_OUT">Transfer Out</SelectItem>
              <SelectItem value="ADJUSTMENT_IN">Adjustment In</SelectItem>
              <SelectItem value="ADJUSTMENT_OUT">Adjustment Out</SelectItem>
              {/* Stock taking posts the two adjustments above; disposal posts these. */}
              <SelectItem value="DAMAGE">Damage</SelectItem>
              <SelectItem value="OBSOLETE">Obsolete</SelectItem>
              <SelectItem value="DISPOSAL">Disposal</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-9" onClick={() => refetch()}>Refresh</Button>
          <ExportCsvButton report="movement" params={{ storeId, type }} />
        </div>
      </Card>
      {isLoading ? <SectionLoading variant="table" /> :
       isError ? <SectionError message="Failed" onRetry={() => refetch()} /> :
       !data || data.items.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No transactions found"
          description="No stock movements match the current filters. Try changing the store, type, or date range."
          size="sm"
        />
       ) : (
        <ResponsiveTable
          mobileCards={data.items.map((t) => (
            <MobileCard
              key={t.id}
              primary={t.itemName ? `${t.itemCode} · ${t.itemName}` : t.itemCode}
              secondary={t.code}
              badge={<StatusPill status={t.type} />}
              meta={[
                { label: "Qty",     value: formatNumber(Math.abs(t.quantity)) },
                { label: "Balance", value: formatNumber(t.balanceAfter) },
                { label: "Store",   value: t.store ?? "—" },
                { label: "Date",    value: new Date(t.transactionDate).toLocaleDateString() },
              ]}
            />
          ))}
        >
          <table className="astu-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Item</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Balance</th>
                <th>User</th>
                <th>Store</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t.id}>
                  <td className="font-mono text-xs">{t.code}</td>
                  <td><Badge variant={statusColor(t.type)} className="text-[10px]">{t.type}</Badge></td>
                  <td className="text-xs">{t.itemCode} {t.itemName ? `· ${t.itemName}` : ""}</td>
                  <td className="text-right font-semibold">{formatNumber(Math.abs(t.quantity))}</td>
                  <td className="text-right">{formatNumber(t.balanceAfter)}</td>
                  <td className="text-xs">{t.user ?? "—"}</td>
                  <td className="text-xs">{t.store ?? "—"}</td>
                  <td className="text-xs whitespace-nowrap">{new Date(t.transactionDate).toLocaleString()}</td>
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

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card className="p-3 border border-border shadow-sm">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold mt-1 tabular ${color ?? ""}`}>{value}</p>
    </Card>
  );
}
