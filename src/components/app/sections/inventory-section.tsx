"use client";

import { useState } from "react";
import { Plus, Search, Package, Eye } from "lucide-react";
import { useInventory, useCreateItem, useCategoriesAndUoms, useInventoryItem } from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader, SectionError, SectionLoading, EmptyState, Pagination, AstuAction, AstuCardTable } from "@/components/app/section-utils";
import { useUIStore } from "@/stores/ui-store";
import { formatCurrency, formatNumber, statusColor } from "@/lib/utils/format";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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

export function InventorySection() {
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const setSelectedItemId = useUIStore((s) => s.setSelectedItemId);

  const { data, isLoading, isError, refetch } = useInventory({ page, limit, search: search || undefined, status: status || undefined, categoryId: categoryId || undefined });
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

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Manage stock items, categories, reorder levels, and current quantities"
        icon={Package}
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" /> New Item
              </Button>
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
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Min</Label>
                    <Input type="number" step="any" {...form.register("minStock")} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Max</Label>
                    <Input type="number" step="any" {...form.register("maxStock")} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Safety</Label>
                    <Input type="number" step="any" {...form.register("safetyStock")} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Reorder</Label>
                    <Input type="number" step="any" {...form.register("reorderLevel")} />
                  </div>
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

      {/* Filters bar */}
      <Card className="mb-4 p-3 border border-border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="relative md:col-span-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 h-9" placeholder="Search by code or name..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={status || "ALL"} onValueChange={(v) => { setStatus(v === "ALL" ? "" : v); setPage(1); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Status" /></SelectTrigger>
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
            <SelectTrigger className="h-9"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {cats.data?.categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? <SectionLoading variant="table" /> :
       isError ? <SectionError message="Failed to load inventory" onRetry={() => refetch()} /> :
       !data || data.items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No inventory items yet"
          description="Add your first stock item to start tracking quantities, values, and reorder levels."
          actionLabel="New Item"
          onAction={() => setCreateOpen(true)}
        />
       ) : (
        <AstuCardTable
          footerAction={<AstuAction onClick={() => setCreateOpen(true)}>+ New</AstuAction>}
        >
          <table className="astu-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Category</th>
                <th>UoM</th>
                <th className="text-right">Quantity</th>
                <th className="text-right">Value</th>
                <th className="text-right">Reorder</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((it) => (
                <tr key={it.id}>
                  <td className="font-mono text-xs">{it.code}</td>
                  <td className="font-medium text-sm">{it.name}</td>
                  <td className="text-xs text-muted-foreground">{it.category.name}</td>
                  <td className="text-xs">{it.uom.code}</td>
                  <td className="text-right font-semibold">{formatNumber(it.totalQuantity)}</td>
                  <td className="text-right text-xs">{formatCurrency(it.totalValue)}</td>
                  <td className="text-right text-xs">{formatNumber(it.reorderLevel)}</td>
                  <td><Badge variant={statusColor(it.status)} className="text-[10px]">{it.status.replace(/_/g, " ")}</Badge></td>
                  <td>
                    <AstuAction onClick={() => setSelectedItemId(it.id)}>
                      <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />View</span>
                    </AstuAction>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPage={setPage} />
        </AstuCardTable>
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

            {/* Stat grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <Stat label="Total Qty" value={formatNumber(item.totalQuantity)} />
              <Stat label="Total Value" value={formatCurrency(item.totalValue)} />
              <Stat label="Avg Unit Cost" value={formatCurrency(item.avgUnitCost)} />
              <Stat label="Category" value={item.category.name} />
              <Stat label="Min Stock" value={formatNumber(item.minStock)} />
              <Stat label="Max Stock" value={formatNumber(item.maxStock)} />
              <Stat label="Safety Stock" value={formatNumber(item.safetyStock)} />
              <Stat label="Reorder Level" value={formatNumber(item.reorderLevel)} />
            </div>

            {/* Store stock */}
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">Store Stock</h4>
              <AstuCardTable>
                <table className="astu-table">
                  <thead>
                    <tr>
                      <th>Store</th>
                      <th className="text-right">Quantity</th>
                      <th className="text-right">Reserved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.storeStock.length === 0 ? (
                      <tr><td colSpan={3} className="text-center text-xs text-muted-foreground py-6">No stock recorded</td></tr>
                    ) : (
                      item.storeStock.map((ws) => (
                        <tr key={ws.id}>
                          <td className="text-sm font-medium">{ws.storeCode} — {ws.storeName}</td>
                          <td className="text-right font-semibold">{formatNumber(ws.quantity)}</td>
                          <td className="text-right text-xs">{formatNumber(ws.reservedQty)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </AstuCardTable>
            </div>

            {/* FIFO layers */}
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">FIFO Layers</h4>
              <AstuCardTable>
                <table className="astu-table">
                  <thead>
                    <tr>
                      <th>Created</th>
                      <th className="text-right">Original</th>
                      <th className="text-right">Remaining</th>
                      <th className="text-right">Unit Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.fifoLayers.length === 0 ? (
                      <tr><td colSpan={4} className="text-center text-xs text-muted-foreground py-6">No FIFO layers</td></tr>
                    ) : (
                      item.fifoLayers.map((l) => (
                        <tr key={l.id}>
                          <td className="text-xs">{new Date(l.createdAt).toLocaleString()}</td>
                          <td className="text-right">{formatNumber(l.originalQty)}</td>
                          <td className="text-right font-semibold">{formatNumber(l.remainingQty)}</td>
                          <td className="text-right">{formatCurrency(l.unitCost)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </AstuCardTable>
            </div>

            {/* Recent transactions */}
            <div>
              <h4 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">Recent Transactions</h4>
              <AstuCardTable>
                <table className="astu-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Balance</th>
                      <th>Date</th>
                      <th>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.recentTransactions.length === 0 ? (
                      <tr><td colSpan={5} className="text-center text-xs text-muted-foreground py-6">No transactions yet</td></tr>
                    ) : (
                      item.recentTransactions.slice(0, 10).map((t) => (
                        <tr key={t.id}>
                          <td><Badge variant={statusColor(t.type)} className="text-[10px]">{t.type}</Badge></td>
                          <td className="text-right">{formatNumber(t.quantity)}</td>
                          <td className="text-right">{formatNumber(t.balanceAfter)}</td>
                          <td className="text-xs">{new Date(t.transactionDate).toLocaleString()}</td>
                          <td className="text-xs">{t.user ?? "system"}</td>
                        </tr>
                      ))
                    )}
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
