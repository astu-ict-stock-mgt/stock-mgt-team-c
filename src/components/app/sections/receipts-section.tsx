"use client";

import { useState } from "react";
import { Plus, Search, ArrowDownToLine, X, Eye } from "lucide-react";
import { useReceipts, useCreateReceipt, useSuppliers, useStores, useInventory, useReceipt } from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, SectionError, SectionLoading, EmptyState, Pagination, AstuAction, AstuCardTable, ResponsiveTable, MobileCard, StatusPill } from "@/components/app/section-utils";
import { PrintDocumentButton } from "@/components/app/print-button";
import { useUIStore } from "@/stores/ui-store";
import { formatCurrency, formatNumber, statusColor, formatDate } from "@/lib/utils/format";
import { toast } from "sonner";

type LineItem = { itemId: string; quantity: number; unitCost: number; remarks?: string };

export function ReceiptsSection() {
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useReceipts({ page, limit, search: search || undefined });
  const setSelectedItemId = useUIStore((s) => s.setSelectedItemId);

  return (
    <div>
      <PageHeader
        title="Stock Receipts"
        description="Goods received from suppliers — FIFO layers are created automatically"
        icon={ArrowDownToLine}
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Receipt
          </Button>
        }
      />

      <Card className="mb-4 p-3 border border-border shadow-sm">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Search by receipt code..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </Card>

      {isLoading ? <SectionLoading variant="table" /> :
       isError ? <SectionError message="Failed to load receipts" onRetry={() => refetch()} /> :
       !data || data.items.length === 0 ? (
        <EmptyState
          icon={ArrowDownToLine}
          title="No receipts yet"
          description="Record your first goods receipt to create FIFO layers and update store stock automatically."
          actionLabel="New Receipt"
          onAction={() => setCreateOpen(true)}
        />
       ) : (
        <ResponsiveTable
          footerAction={<AstuAction onClick={() => setCreateOpen(true)}>+ New</AstuAction>}
          mobileCards={data.items.map((r) => (
            <MobileCard
              key={r.id}
              primary={r.supplier.name}
              secondary={r.code}
              badge={<StatusPill status={r.status} />}
              meta={[
                { label: "Store",  value: r.store.name },
                { label: "Amount", value: formatCurrency(r.totalAmount) },
                { label: "Qty",    value: formatNumber(r.totalQuantity) },
                { label: "Date",   value: formatDate(r.receiptDate) },
              ]}
              action={
                <AstuAction onClick={() => setSelectedItemId(r.id)}>
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
                <th>Supplier</th>
                <th>Store</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Amount</th>
                <th>Items</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-xs">{r.code}</td>
                  <td className="text-xs">{r.supplier.name}</td>
                  <td className="text-xs">{r.store.name}</td>
                  <td className="text-right font-semibold">{formatNumber(r.totalQuantity)}</td>
                  <td className="text-right">{formatCurrency(r.totalAmount)}</td>
                  <td className="text-xs">{r.itemCount}</td>
                  <td className="text-xs">{formatDate(r.receiptDate)}</td>
                  <td><Badge variant={statusColor(r.status)} className="text-[10px]">{r.status}</Badge></td>
                  <td>
                    <AstuAction onClick={() => setSelectedItemId(r.id)}>
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

      <ReceiptDetailDrawer />
      <CreateReceiptDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CreateReceiptDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const suppliers = useSuppliers({ page: 1, limit: 100 });
  const stores = useStores();
  const inventory = useInventory({ page: 1, limit: 100 });
  const create = useCreateReceipt();

  const [supplierId, setSupplierId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);

  const addItem = () => setItems((arr) => [...arr, { itemId: "", quantity: 1, unitCost: 0 }]);
  const removeItem = (idx: number) => setItems((arr) => arr.filter((_, i) => i !== idx));
  const updateItem = (idx: number, patch: Partial<LineItem>) => setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const totalAmount = items.reduce((s, i) => s + (i.quantity || 0) * (i.unitCost || 0), 0);
  const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0);

  const onSubmit = async () => {
    if (!supplierId) return toast.error("Select a supplier");
    if (!storeId) return toast.error("Select a store");
    if (items.length === 0) return toast.error("Add at least one item");
    if (items.some((i) => !i.itemId || i.quantity <= 0 || i.unitCost < 0)) return toast.error("Check item details");
    try {
      await create.mutateAsync({ supplierId, storeId, inspectionNotes: inspectionNotes || undefined, items });
      toast.success("Stock received successfully — FIFO layers created");
      onOpenChange(false);
      setSupplierId(""); setStoreId(""); setInspectionNotes(""); setItems([]);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4" /> Receive Stock
          </DialogTitle>
          <DialogDescription>Creates FIFO layers + store stock + transaction log (atomic)</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Supplier *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.data?.items.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Store *</Label>
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                <SelectContent>
                  {stores.data?.items.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Inspection Notes</Label>
            <Input value={inspectionNotes} onChange={(e) => setInspectionNotes(e.target.value)} placeholder="Optional notes from inspection" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-primary">Items</Label>
              <Button type="button" variant="outline" size="sm" className="h-7" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Add Item</Button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto border border-border rounded p-2 bg-surface-2">
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No items added</p>
              ) : items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-card p-2 rounded border border-border">
                  <div className="col-span-5 space-y-1">
                    <Label className="text-[10px]">Item</Label>
                    <Select value={it.itemId} onValueChange={(v) => updateItem(idx, { itemId: v })}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Select item" /></SelectTrigger>
                      <SelectContent>
                        {inventory.data?.items.map((i) => (
                          <SelectItem key={i.id} value={i.id}>{i.code} — {i.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[10px]">Qty</Label>
                    <Input type="number" step="any" className="h-8" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label className="text-[10px]">Unit Cost</Label>
                    <Input type="number" step="any" className="h-8" value={it.unitCost} onChange={(e) => updateItem(idx, { unitCost: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-[10px] text-muted-foreground">Total</p>
                    <p className="text-xs font-semibold">{formatCurrency(it.quantity * it.unitCost)}</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(idx)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            {items.length > 0 && (
              <div className="mt-2 flex justify-between text-sm font-semibold px-1">
                <span>Total Quantity: {formatNumber(totalQty)}</span>
                <span className="text-primary">Total Amount: {formatCurrency(totalAmount)}</span>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={create.isPending} className="bg-primary hover:bg-primary-strong text-primary-foreground">
            {create.isPending ? "Receiving..." : "Receive Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReceiptDetailDrawer() {
  const selectedItemId = useUIStore((s) => s.selectedItemId);
  const setSelectedItemId = useUIStore((s) => s.setSelectedItemId);
  const { data: receipt, isLoading } = useReceipt(selectedItemId);

  return (
    <Dialog open={!!selectedItemId} onOpenChange={(open) => !open && setSelectedItemId(null)}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        {isLoading ? <SectionLoading /> : receipt ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-mono text-base text-primary">{receipt.code}</DialogTitle>
              <DialogDescription>
                Received {formatDate(receipt.receiptDate, true)} · {receipt.supplier.name} → {receipt.store.name}
              </DialogDescription>
            </DialogHeader>
            <div className="mb-3 flex justify-end">
              <PrintDocumentButton kind="receipts" id={receipt.id} label="Print GRN" />
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded border border-border bg-surface-2 px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Total Quantity</p>
                <p className="text-sm font-semibold tabular">{formatNumber(receipt.totalQuantity)}</p>
              </div>
              <div className="rounded border border-border bg-surface-2 px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Total Amount</p>
                <p className="text-sm font-semibold text-primary tabular">{formatCurrency(receipt.totalAmount)}</p>
              </div>
              <div className="rounded border border-border bg-surface-2 px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Status</p>
                <Badge variant={statusColor(receipt.status)} className="text-[10px]">{receipt.status}</Badge>
              </div>
            </div>
            {receipt.inspectionNotes && (
              <div className="rounded-md bg-warning-subtle border border-warning/40 p-3 text-xs mb-4">
                <p className="font-semibold mb-1 text-warning-strong">Inspection Notes</p>
                <p className="text-warning-strong">{receipt.inspectionNotes}</p>
              </div>
            )}
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">Received Items</h4>
              <AstuCardTable>
                <table className="astu-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Unit Cost</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipt.items.map((it) => (
                      <tr key={it.id}>
                        <td>
                          <p className="text-sm font-medium">{it.itemName}</p>
                          <p className="text-xs text-muted-foreground">{it.itemCode} · {it.uom}</p>
                        </td>
                        <td className="text-right">{formatNumber(it.quantity)}</td>
                        <td className="text-right">{formatCurrency(it.unitCost)}</td>
                        <td className="text-right font-semibold">{formatCurrency(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AstuCardTable>
            </div>
            {receipt.fifoLayers.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">FIFO Layers Created</h4>
                <AstuCardTable>
                  <table className="astu-table">
                    <thead>
                      <tr>
                        <th className="text-right">Original Qty</th>
                        <th className="text-right">Remaining</th>
                        <th className="text-right">Unit Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipt.fifoLayers.map((l) => (
                        <tr key={l.id}>
                          <td className="text-right">{formatNumber(l.originalQty)}</td>
                          <td className="text-right font-semibold text-success">{formatNumber(l.remainingQty)}</td>
                          <td className="text-right">{formatCurrency(l.unitCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </AstuCardTable>
              </div>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
