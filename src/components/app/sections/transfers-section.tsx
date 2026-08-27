"use client";

import { useMemo, useState } from "react";
import { Plus, Search, ArrowLeftRight, X, Eye } from "lucide-react";
import { useTransfers, useCreateTransfer, useTransfer, useStores, useInventory } from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, SectionError, SectionLoading, EmptyState, Pagination, AstuAction, AstuCardTable, ResponsiveTable, MobileCard, StatusPill } from "@/components/app/section-utils";
import { useUIStore } from "@/stores/ui-store";
import { formatCurrency, formatNumber, statusColor, formatDate } from "@/lib/utils/format";
import { toast } from "sonner";

type LineItem = { itemId: string; quantity: number };

export function TransfersSection() {
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useTransfers({ page, limit, search: search || undefined });
  const setSelectedItemId = useUIStore((s) => s.setSelectedItemId);

  return (
    <div>
      <PageHeader
        title="Stock Transfers"
        description="Move stock between stores — FIFO layers travel with the goods, so cost stays exact"
        icon={ArrowLeftRight}
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Transfer
          </Button>
        }
      />

      <Card className="mb-4 p-3 border border-border shadow-sm">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 h-9"
            placeholder="Search by transfer code..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </Card>

      {isLoading ? <SectionLoading variant="table" /> :
       isError ? <SectionError message="Failed to load transfers" onRetry={() => refetch()} /> :
       !data || data.items.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No stock transfers yet"
          description="Move stock from one store to another. The oldest FIFO layers leave first and are recreated at the destination with their original cost."
          actionLabel="New Transfer"
          onAction={() => setCreateOpen(true)}
        />
       ) : (
        <ResponsiveTable
          footerAction={<AstuAction onClick={() => setCreateOpen(true)}>+ New</AstuAction>}
          mobileCards={data.items.map((t) => (
            <MobileCard
              key={t.id}
              primary={`${t.fromStore.code} → ${t.toStore.code}`}
              secondary={t.code}
              badge={<StatusPill status={t.status} />}
              meta={[
                { label: "From", value: t.fromStore.name },
                { label: "To", value: t.toStore.name },
                { label: "Qty", value: formatNumber(t.totalQuantity) },
                { label: "Date", value: formatDate(t.transferDate) },
              ]}
              action={
                <AstuAction onClick={() => setSelectedItemId(t.id)}>
                  <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />View</span>
                </AstuAction>
              }
            />
          ))}
        >
          <table className="astu-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>From</th>
                <th>To</th>
                <th className="text-right">Qty</th>
                <th>Items</th>
                <th>By</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t.id}>
                  <td className="font-mono text-xs">{t.code}</td>
                  <td className="text-xs">{t.fromStore.name}</td>
                  <td className="text-xs">{t.toStore.name}</td>
                  <td className="text-right font-semibold">{formatNumber(t.totalQuantity)}</td>
                  <td className="text-xs">{t.itemCount}</td>
                  <td className="text-xs">{t.transferredBy.fullName}</td>
                  <td className="text-xs">{formatDate(t.transferDate)}</td>
                  <td><Badge variant={statusColor(t.status)} className="text-[10px]">{t.status}</Badge></td>
                  <td>
                    <AstuAction onClick={() => setSelectedItemId(t.id)}>
                      <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />View</span>
                    </AstuAction>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPage={setPage} />
        </ResponsiveTable>
      )}

      <TransferDetailDrawer />
      <CreateTransferDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CreateTransferDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const stores = useStores();
  const inventory = useInventory({ page: 1, limit: 100 });
  const create = useCreateTransfer();

  const [fromStoreId, setFromStoreId] = useState("");
  const [toStoreId, setToStoreId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);

  const addItem = () => setItems((arr) => [...arr, { itemId: "", quantity: 1 }]);
  const removeItem = (idx: number) => setItems((arr) => arr.filter((_, i) => i !== idx));
  const updateItem = (idx: number, patch: Partial<LineItem>) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0);

  // The destination cannot also be the source, so it is removed from the list
  // rather than left selectable and rejected by the server afterwards.
  const destinationStores = useMemo(
    () => (stores.data?.items ?? []).filter((w) => w.id !== fromStoreId),
    [stores.data, fromStoreId]
  );

  const reset = () => {
    setFromStoreId(""); setToStoreId(""); setNotes(""); setItems([]);
  };

  const onSubmit = async () => {
    if (!fromStoreId) return toast.error("Select the source store");
    if (!toStoreId) return toast.error("Select the destination store");
    if (fromStoreId === toStoreId) return toast.error("Source and destination must be different stores");
    if (items.length === 0) return toast.error("Add at least one item");
    if (items.some((i) => !i.itemId || i.quantity <= 0)) return toast.error("Check the item quantities");
    const ids = items.map((i) => i.itemId);
    if (new Set(ids).size !== ids.length) return toast.error("The same item is listed twice — combine the lines");

    try {
      const result = await create.mutateAsync({ fromStoreId, toStoreId, notes: notes || undefined, items });
      toast.success(`Transfer ${result.code} completed — ${formatNumber(result.totalQuantity)} unit(s) moved`);
      onOpenChange(false);
      reset();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Transfer failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" /> Transfer Stock
          </DialogTitle>
          <DialogDescription>
            Consumes FIFO layers at the source (oldest first) and recreates them at the destination with the same unit cost
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">From Store *</Label>
              <Select
                value={fromStoreId}
                onValueChange={(v) => {
                  setFromStoreId(v);
                  if (v === toStoreId) setToStoreId("");
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {stores.data?.items.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">To Store *</Label>
              <Select value={toStoreId} onValueChange={setToStoreId} disabled={!fromStoreId}>
                <SelectTrigger>
                  <SelectValue placeholder={fromStoreId ? "Select destination" : "Pick a source first"} />
                </SelectTrigger>
                <SelectContent>
                  {destinationStores.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold uppercase tracking-wider">Items</Label>
              <Button type="button" variant="outline" size="sm" className="h-7" onClick={addItem}>
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </Button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto border border-border rounded p-2 bg-surface-2">
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No items added</p>
              ) : items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-card p-2 rounded border border-border">
                  <div className="col-span-7 space-y-1">
                    <Label className="text-[10px]">Item</Label>
                    <Select value={it.itemId} onValueChange={(v) => updateItem(idx, { itemId: v })}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Select item" /></SelectTrigger>
                      <SelectContent>
                        {inventory.data?.items.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.code} — {i.name} ({formatNumber(i.totalQuantity)} {i.uom.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4 space-y-1">
                    <Label className="text-[10px]">Quantity</Label>
                    <Input
                      type="number"
                      step="any"
                      className="h-8"
                      value={it.quantity}
                      onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(idx)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            {items.length > 0 && (
              <div className="mt-2 text-sm font-semibold px-1">
                Total Quantity: <span className="tabular">{formatNumber(totalQty)}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={create.isPending}>
            {create.isPending ? "Transferring..." : "Transfer Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferDetailDrawer() {
  const selectedItemId = useUIStore((s) => s.selectedItemId);
  const setSelectedItemId = useUIStore((s) => s.setSelectedItemId);
  const { data: transfer, isLoading } = useTransfer(selectedItemId);

  return (
    <Dialog open={!!selectedItemId} onOpenChange={(open) => !open && setSelectedItemId(null)}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        {isLoading ? <SectionLoading /> : transfer ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-mono text-base">{transfer.code}</DialogTitle>
              <DialogDescription>
                Transferred {formatDate(transfer.transferDate, true)} · {transfer.fromStore.name} → {transfer.toStore.name}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded border border-border bg-surface-2 px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Total Quantity</p>
                <p className="text-sm font-semibold tabular">{formatNumber(transfer.totalQuantity)}</p>
              </div>
              <div className="rounded border border-border bg-surface-2 px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Moved By</p>
                <p className="text-sm font-semibold">{transfer.transferredBy.fullName}</p>
              </div>
              <div className="rounded border border-border bg-surface-2 px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Status</p>
                <Badge variant={statusColor(transfer.status)} className="text-[10px]">{transfer.status}</Badge>
              </div>
            </div>

            {transfer.notes ? (
              <p className="mb-4 rounded border border-border bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
                {transfer.notes}
              </p>
            ) : null}

            <div>
              <h4 className="text-xs font-semibold mb-2 uppercase tracking-wider">Transferred Items</h4>
              <AstuCardTable>
                <table className="astu-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Unit Cost</th>
                      <th className="text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfer.items.map((it) => (
                      <tr key={it.id}>
                        <td>
                          <p className="text-sm font-medium">{it.itemName}</p>
                          <p className="text-xs text-muted-foreground">{it.itemCode} · {it.uom}</p>
                        </td>
                        <td className="text-right">{formatNumber(it.quantity)}</td>
                        <td className="text-right">{formatCurrency(it.unitCost)}</td>
                        <td className="text-right font-semibold">{formatCurrency(it.quantity * it.unitCost)}</td>
                      </tr>
                    ))}
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
