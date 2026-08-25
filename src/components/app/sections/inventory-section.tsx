"use client";

import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Package, Eye, Download } from "lucide-react";
import { useInventory, useCreateItem, useCategoriesAndUoms, useInventoryItem } from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader, SectionError, SectionLoading, EmptyState, AstuAction, AstuCardTable, MobileCard, StatusPill } from "@/components/app/section-utils";
import { useUIStore } from "@/stores/ui-store";
import { formatCurrency, formatNumber, statusColor } from "@/lib/utils/format";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { InventoryItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const CreateItemSchema = z.object({
  code: z.string().min(2, "Code is required"),
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  uomId: z.string().min(1, "Unit is required"),
  minStock: z.coerce.number().min(0).default(0),
  maxStock: z.coerce.number().min(0).default(0),
  safetyStock: z.coerce.number().min(0).default(0),
  reorderLevel: z.coerce.number().min(0).default(0),
});
type CreateItemForm = z.infer<typeof CreateItemSchema>;

/* ── CSV export helper ────────────────────────────────────────────── */
function exportToCsv(rows: InventoryItem[], filename = "inventory-export.csv") {
  const headers = ["Code", "Name", "Category", "UoM", "Quantity", "Value", "Reorder Level", "Status"];
  const lines = rows.map((r) => [
    r.code,
    `"${r.name.replace(/"/g, '""')}"`,
    r.category.name,
    r.uom.code,
    r.totalQuantity,
    r.totalValue,
    r.reorderLevel,
    r.status,
  ].join(","));
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function InventorySection() {
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(25);
  const [search, setSearch]       = useState("");
  const [status, setStatus]       = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const setSelectedItemId = useUIStore((s) => s.setSelectedItemId);

  const { data, isLoading, isError, refetch } = useInventory({
    page,
    limit: pageSize,
    search: search || undefined,
    status: status || undefined,
    categoryId: categoryId || undefined,
  });
  const cats = useCategoriesAndUoms();
  const createItem = useCreateItem();

  const form = useForm<CreateItemForm>({
    resolver: zodResolver(CreateItemSchema),
    defaultValues: { code: "", name: "", description: "", categoryId: "", uomId: "", minStock: 0, maxStock: 0, safetyStock: 0, reorderLevel: 0 },
  });

  const onSubmit = async (values: CreateItemForm) => {
    try {
      await createItem.mutateAsync(values);
      toast.success("Item created successfully");
      setCreateOpen(false);
      form.reset();
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to create item");
    }
  };

  /* ── Column definitions ─────────────────────────────────────────── */
  const columns = useMemo<ColumnDef<InventoryItem, unknown>[]>(() => [
    {
      id: "code",
      accessorKey: "code",
      header: "Code",
      meta: { label: "Code" },
      cell: ({ getValue }) => (
        <span className="font-mono text-xs">{getValue() as string}</span>
      ),
      size: 110,
    },
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
      meta: { label: "Name" },
      cell: ({ getValue }) => (
        <span className="font-medium text-sm">{getValue() as string}</span>
      ),
    },
    {
      id: "category",
      accessorFn: (row) => row.category.name,
      header: "Category",
      meta: { label: "Category" },
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">{getValue() as string}</span>
      ),
    },
    {
      id: "uom",
      accessorFn: (row) => row.uom.code,
      header: "UoM",
      meta: { label: "Unit" },
      cell: ({ getValue }) => <span className="text-xs">{getValue() as string}</span>,
      size: 70,
    },
    {
      id: "totalQuantity",
      accessorKey: "totalQuantity",
      header: "Quantity",
      meta: { label: "Quantity" },
      cell: ({ getValue }) => (
        <span className="tabular font-semibold">{formatNumber(getValue() as number)}</span>
      ),
      size: 100,
    },
    {
      id: "totalValue",
      accessorKey: "totalValue",
      header: "Value",
      meta: { label: "Value" },
      cell: ({ getValue }) => (
        <span className="tabular text-xs">{formatCurrency(getValue() as number)}</span>
      ),
      size: 120,
    },
    {
      id: "reorderLevel",
      accessorKey: "reorderLevel",
      header: "Reorder",
      meta: { label: "Reorder Level" },
      cell: ({ getValue }) => (
        <span className="tabular text-xs">{formatNumber(getValue() as number)}</span>
      ),
      size: 90,
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      meta: { label: "Status" },
      enableSorting: false,
      cell: ({ getValue }) => <StatusPill status={getValue() as string} />,
      size: 130,
    },
    {
      id: "actions",
      header: "",
      meta: { label: "Actions" },
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <AstuAction onClick={() => setSelectedItemId(row.original.id)}>
          <Eye className="h-3 w-3" /> View
        </AstuAction>
      ),
      size: 70,
    },
  ], [setSelectedItemId]);

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Manage stock items, categories, reorder levels, and current quantities"
        icon={Package}
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4" /> New Item</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-primary">Create Inventory Item</DialogTitle>
                <DialogDescription>Register a new stockable item with reorder rules</DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Item Code *</Label>
                    <Input {...form.register("code")} placeholder="e.g. IT-LP-001" />
                    {form.formState.errors.code && <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Name *</Label>
                    <Input {...form.register("name")} placeholder="e.g. Dell Latitude 5520" />
                    {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Description</Label>
                  <Input {...form.register("description")} placeholder="Optional description" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Category *</Label>
                    <Select onValueChange={(v) => form.setValue("categoryId", v)}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {cats.data?.categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.categoryId && <p className="text-xs text-destructive">{form.formState.errors.categoryId.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Unit *</Label>
                    <Select onValueChange={(v) => form.setValue("uomId", v)}>
                      <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                      <SelectContent>
                        {cats.data?.uoms.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.code} — {u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.uomId && <p className="text-xs text-destructive">{form.formState.errors.uomId.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(["minStock", "maxStock", "safetyStock", "reorderLevel"] as const).map((f) => (
                    <div key={f} className="space-y-1">
                      <Label className="text-xs font-semibold capitalize">{f.replace(/([A-Z])/g, " $1").trim()}</Label>
                      <Input type="number" step="any" {...form.register(f)} />
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createItem.isPending} className="bg-primary hover:bg-primary-strong text-primary-foreground">
                    {createItem.isPending ? "Creating..." : "Create Item"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Domain-specific filter row — status + category dropdowns live here.
          DataTable owns the text search input inside its own toolbar. */}
      <div className="mb-3 flex flex-wrap gap-2">
        <Select value={status || "ALL"} onValueChange={(v) => { setStatus(v === "ALL" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="AVAILABLE">Available</SelectItem>
            <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
            <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
            <SelectItem value="DAMAGED">Damaged</SelectItem>
            <SelectItem value="OBSOLETE">Obsolete</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryId || "ALL"} onValueChange={(v) => { setCategoryId(v === "ALL" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {cats.data?.categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <SectionLoading variant="table" /> :
       isError ? <SectionError message="Failed to load inventory" onRetry={() => refetch()} /> :
       !data ? null : data.total === 0 && !search && !status && !categoryId ? (
        <EmptyState
          icon={Package}
          title="No inventory items yet"
          description="Add your first stock item to start tracking quantities, values, and reorder levels."
          actionLabel="New Item"
          onAction={() => setCreateOpen(true)}
        />
       ) : (
        <>
          {/* ── Mobile card list (< sm) ── */}
          <div className="sm:hidden astu-card overflow-hidden">
            {data.items.map((it) => (
              <MobileCard
                key={it.id}
                primary={it.name}
                secondary={it.code}
                badge={<StatusPill status={it.status} />}
                meta={[
                  { label: "Qty",      value: formatNumber(it.totalQuantity) },
                  { label: "Value",    value: formatCurrency(it.totalValue) },
                  { label: "Category", value: it.category.name },
                  { label: "Reorder",  value: formatNumber(it.reorderLevel) },
                ]}
                action={
                  <AstuAction onClick={() => setSelectedItemId(it.id)}>
                    <Eye className="h-3 w-3" /> View
                  </AstuAction>
                }
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
              searchPlaceholder="Search by code or name…"
              disableClientSearch
              manualPagination={{
                page,
                pageSize,
                total: data.total,
                onPage: setPage,
                onPageSize: (s) => { setPageSize(s); setPage(1); },
              }}
              toolbarRight={
                <Button size="sm" className="h-8 text-xs" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-3.5 w-3.5" /> New
                </Button>
              }
              bulkActions={(_rows, clearSelection) => {
                const rows = _rows;
                return (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => {
                      exportToCsv(rows);
                      toast.success(`Exported ${rows.length} item${rows.length !== 1 ? "s" : ""}`);
                      clearSelection();
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export {rows.length}
                  </Button>
                );
              }}
            />
          </div>
        </>
      )}

      <ItemDetailDrawer />
    </div>
  );
}

function ItemDetailDrawer() {
  const selectedItemId = useUIStore((s) => s.selectedItemId);
  const setSelectedItemId = useUIStore((s) => s.setSelectedItemId);
  const { data: item, isLoading } = useInventoryItem(selectedItemId);

  if (!selectedItemId) return null;

  return (
    <Dialog open={!!selectedItemId} onOpenChange={(open) => !open && setSelectedItemId(null)}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        {isLoading ? <SectionLoading variant="settings" label="Loading item..." /> : item ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary">
                <Package className="h-4 w-4" />
                <span className="font-mono text-xs bg-surface-2 px-2 py-0.5 rounded">{item.code}</span>
                {item.name}
              </DialogTitle>
              <DialogDescription>{item.description || "No description"}</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Total Qty"      value={formatNumber(item.totalQuantity)} />
              <Stat label="Total Value"    value={formatCurrency(item.totalValue)} />
              <Stat label="Avg Unit Cost"  value={formatCurrency(item.avgUnitCost)} />
              <Stat label="Category"       value={item.category.name} />
              <Stat label="Min Stock"      value={formatNumber(item.minStock)} />
              <Stat label="Max Stock"      value={formatNumber(item.maxStock)} />
              <Stat label="Safety Stock"   value={formatNumber(item.safetyStock)} />
              <Stat label="Reorder Level"  value={formatNumber(item.reorderLevel)} />
            </div>

            <div className="mb-4">
              <h4 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">Store Stock</h4>
              <AstuCardTable>
                <table className="astu-table">
                  <thead><tr><th>Store</th><th className="text-right">Quantity</th><th className="text-right">Reserved</th></tr></thead>
                  <tbody>
                    {item.storeStock.length === 0
                      ? <tr><td colSpan={3} className="text-center text-xs text-muted-foreground py-6">No stock recorded</td></tr>
                      : item.storeStock.map((ws) => (
                          <tr key={ws.id}>
                            <td className="text-sm font-medium">{ws.storeCode} — {ws.storeName}</td>
                            <td className="text-right font-semibold">{formatNumber(ws.quantity)}</td>
                            <td className="text-right text-xs">{formatNumber(ws.reservedQty)}</td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
              </AstuCardTable>
            </div>

            <div className="mb-4">
              <h4 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">FIFO Layers</h4>
              <AstuCardTable>
                <table className="astu-table">
                  <thead><tr><th>Created</th><th className="text-right">Original</th><th className="text-right">Remaining</th><th className="text-right">Unit Cost</th></tr></thead>
                  <tbody>
                    {item.fifoLayers.length === 0
                      ? <tr><td colSpan={4} className="text-center text-xs text-muted-foreground py-6">No FIFO layers</td></tr>
                      : item.fifoLayers.map((l) => (
                          <tr key={l.id}>
                            <td className="text-xs">{new Date(l.createdAt).toLocaleString()}</td>
                            <td className="text-right">{formatNumber(l.originalQty)}</td>
                            <td className="text-right font-semibold">{formatNumber(l.remainingQty)}</td>
                            <td className="text-right">{formatCurrency(l.unitCost)}</td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
              </AstuCardTable>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">Recent Transactions</h4>
              <AstuCardTable>
                <table className="astu-table">
                  <thead><tr><th>Type</th><th className="text-right">Qty</th><th className="text-right">Balance</th><th>Date</th><th>By</th></tr></thead>
                  <tbody>
                    {item.recentTransactions.length === 0
                      ? <tr><td colSpan={5} className="text-center text-xs text-muted-foreground py-6">No transactions yet</td></tr>
                      : item.recentTransactions.slice(0, 10).map((t) => (
                          <tr key={t.id}>
                            <td><Badge variant={statusColor(t.type)} className="text-[10px]">{t.type}</Badge></td>
                            <td className="text-right">{formatNumber(t.quantity)}</td>
                            <td className="text-right">{formatNumber(t.balanceAfter)}</td>
                            <td className="text-xs">{new Date(t.transactionDate).toLocaleString()}</td>
                            <td className="text-xs">{t.user ?? "system"}</td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
              </AstuCardTable>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold mt-0.5 tabular">{value}</p>
    </div>
  );
}
