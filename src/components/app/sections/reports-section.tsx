"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { BarChart3, Package } from "lucide-react";
import { PageHeader, SectionError, SectionLoading, SectionEmpty, Pagination, AstuCardTable, TabBar } from "@/components/app/section-utils";
import { useInventoryReport, useValuationReport, useMovementReport, useCategoriesAndUoms, useWarehouses } from "@/lib/api/hooks";
import { formatCurrency, formatNumber, statusColor } from "@/lib/utils/format";

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
  const whs = useWarehouses();
  const [categoryId, setCategoryId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const { data, isLoading, isError, refetch } = useInventoryReport({ categoryId: categoryId || undefined, warehouseId: warehouseId || undefined, lowStockOnly });

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
          <Select value={warehouseId || "ALL"} onValueChange={(v) => setWarehouseId(v === "ALL" ? "" : v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Warehouse" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Warehouses</SelectItem>
              {whs.data?.items.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
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
        </div>
      </Card>

      {isLoading ? <SectionLoading /> :
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
          {data.items.length === 0 ? <SectionEmpty title="No items match filters" /> : (
            <AstuCardTable>
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
            </AstuCardTable>
          )}
        </>
      )}
    </div>
  );
}

function ValuationReportView() {
  const cats = useCategoriesAndUoms();
  const whs = useWarehouses();
  const [categoryId, setCategoryId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const { data, isLoading, isError, refetch } = useValuationReport({ categoryId: categoryId || undefined, warehouseId: warehouseId || undefined });

  const chartData = (data?.items ?? []).slice(0, 10).map((i) => ({ name: i.code, value: i.totalValue }));

  return (
    <div>
      <Card className="mb-4 p-3 border border-border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Select value={categoryId || "ALL"} onValueChange={(v) => setCategoryId(v === "ALL" ? "" : v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {cats.data?.categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={warehouseId || "ALL"} onValueChange={(v) => setWarehouseId(v === "ALL" ? "" : v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Warehouse" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Warehouses</SelectItem>
              {whs.data?.items.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-9" onClick={() => refetch()}>Refresh</Button>
        </div>
      </Card>

      {isLoading ? <SectionLoading /> :
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
          {data.items.length === 0 ? <SectionEmpty title="No items to value" /> : (
            <AstuCardTable>
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
            </AstuCardTable>
          )}
        </>
      )}
    </div>
  );
}

function MovementReportView() {
  const whs = useWarehouses();
  const [warehouseId, setWarehouseId] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const limit = 30;
  const { data, isLoading, isError, refetch } = useMovementReport({ page, limit, warehouseId: warehouseId || undefined, type: type || undefined });

  return (
    <div>
      <Card className="mb-4 p-3 border border-border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Select value={warehouseId || "ALL"} onValueChange={(v) => { setWarehouseId(v === "ALL" ? "" : v); setPage(1); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Warehouse" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Warehouses</SelectItem>
              {whs.data?.items.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
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
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-9" onClick={() => refetch()}>Refresh</Button>
        </div>
      </Card>
      {isLoading ? <SectionLoading /> :
       isError ? <SectionError message="Failed" onRetry={() => refetch()} /> :
       !data || data.items.length === 0 ? <SectionEmpty title="No transactions found" /> : (
        <AstuCardTable>
          <table className="astu-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Item</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Balance</th>
                <th>User</th>
                <th>Warehouse</th>
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
                  <td className="text-xs">{t.warehouse ?? "—"}</td>
                  <td className="text-xs whitespace-nowrap">{new Date(t.transactionDate).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPage={setPage} />
        </AstuCardTable>
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
