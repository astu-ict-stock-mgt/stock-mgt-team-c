// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { Plus, ArrowLeftRight, X, Eye, PackageCheck } from "lucide-react";
import {
  useTransfers, useTransfer, useStores, useStoreBinStocks, useInventory,
  useCreateTransfer, useSubmitTransfer, useApproveTransfer, useRejectTransfer,
  useDispatchTransfer, useReceiveTransfer, useMe,
} from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader, SectionError, SectionLoading, SectionEmpty, AstuCardTable, StatusPill } from "@/components/app/section-utils";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { toast } from "sonner";
import type { TransferRequest } from "@/lib/types";

type LineItem = { itemId: string; quantity: number };

export function TransfersSection() {
  const me = useMe();
  const permissions = useMemo(() => new Set(me.data?.permissions ?? []), [me.data?.permissions]);
  const roles = useMemo(() => new Set(me.data?.roles ?? []), [me.data?.roles]);
  const isAdmin = roles.has("ADMINISTRATOR");

  const { data, isLoading, isError, refetch } = useTransfers();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const canCreate = isAdmin || permissions.has("transfers.create");
  const canApprove = isAdmin || permissions.has("transfers.approve");
  const canDispatch = isAdmin || permissions.has("transfers.dispatch");
  const canReceive = isAdmin || permissions.has("transfers.receive");

  return (
    <div>
      <PageHeader
        title="Inter-Store Transfers"
        description="Move stock between stores — dispatch consumes FIFO at the source; receiving applies the blended cost at the destination"
        icon={ArrowLeftRight}
        action={canCreate && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Transfer
          </Button>
        )}
      />

      {isLoading ? <SectionLoading /> :
       isError ? <SectionError message="Failed to load transfers" onRetry={() => refetch()} /> :
       !data || data.length === 0 ? <SectionEmpty title="No transfers yet" message="Create a transfer to move stock between stores" /> :
        <AstuCardTable>
          <table className="astu-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>From</th>
                <th>To</th>
                <th className="text-right">Items</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.id}>
                  <td className="font-mono text-xs">{t.code}</td>
                  <td className="text-xs">{t.fromStore?.name ?? "—"}</td>
                  <td className="text-xs">{t.toStore?.name ?? "—"}</td>
                  <td className="text-right">{t.items?.length ?? 0}</td>
                  <td className="text-xs">{formatDate(t.createdAt)}</td>
                  <td><StatusPill status={t.status} /></td>
                  <td>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedId(t.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AstuCardTable>
      }

      {createOpen && (
        <CreateTransferDialog
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => { setCreateOpen(false); setSelectedId(id); }}
        />
      )}

      <TransferDetailDialog
        id={selectedId}
        onClose={() => setSelectedId(null)}
        canApprove={canApprove}
        canDispatch={canDispatch}
        canReceive={canReceive}
      />
    </div>
  );
}

function CreateTransferDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { data: stores } = useStores();
  const { data: inventory } = useInventory({ page: 1, limit: 200 });
  const create = useCreateTransfer();
  const [fromStoreId, setFromStoreId] = useState("");
  const [toStoreId, setToStoreId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([{ itemId: "", quantity: 1 }]);
  const { data: srcBinStocks } = useStoreBinStocks(fromStoreId || null);

  const addLine = () => setLines((p) => [...p, { itemId: "", quantity: 1 }]);
  const updateLine = (idx: number, patch: Partial<LineItem>) =>
    setLines((p) => p.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const removeLine = (idx: number) => setLines((p) => p.filter((_, i) => i !== idx));

  const qtyFor = (itemId: string) => {
    const bs = (srcBinStocks?.items ?? []).filter((b) => b.itemId === itemId);
    return bs.reduce((s, b) => s + b.quantity, 0);
  };

  const canSubmit =
    fromStoreId && toStoreId && fromStoreId !== toStoreId &&
    lines.length > 0 && lines.every((l) => l.itemId && l.quantity > 0);

  const onSubmit = async () => {
    if (fromStoreId === toStoreId) { toast.error("Source and destination stores must be different"); return; }
    if (!canSubmit) { toast.error("Select both stores and add at least one item with a positive quantity"); return; }
    try {
      const trf = await create.mutateAsync({
        fromStoreId, toStoreId, reason: reason || undefined, notes: notes || undefined,
        items: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
      });
      toast.success("Transfer created");
      onCreated(trf.id);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to create transfer");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New inter-store transfer</DialogTitle>
          <DialogDescription>Define which items and quantities to move between stores.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>From store *</Label>
              <Select value={fromStoreId} onValueChange={setFromStoreId}>
                <SelectTrigger><SelectValue placeholder="Source store" /></SelectTrigger>
                <SelectContent>
                  {(stores?.items ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>To store *</Label>
              <Select value={toStoreId} onValueChange={setToStoreId}>
                <SelectTrigger><SelectValue placeholder="Destination store" /></SelectTrigger>
                <SelectContent>
                  {(stores?.items ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Reason</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Reallocation" />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Items ({lines.length})</Label>
              <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-3.5 w-3.5" /> Add</Button>
            </div>
            <div className="space-y-2">
              {lines.map((l, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Select value={l.itemId} onValueChange={(v) => updateLine(idx, { itemId: v })}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Item" /></SelectTrigger>
                    <SelectContent>
                      {(inventory?.items ?? []).map((it) => (
                        <SelectItem key={it.id} value={it.id}>
                          {it.code} · {it.name}{fromStoreId ? ` (available: ${formatNumber(qtyFor(it.id))})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number" min="1" className="w-24" placeholder="Qty"
                    value={l.quantity || ""}
                    onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeLine(idx)}><X className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit} disabled={create.isPending}>{create.isPending ? "Creating..." : "Create Transfer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferDetailDialog({ id, onClose, canApprove, canDispatch, canReceive }: {
  id: string | null;
  onClose: () => void;
  canApprove: boolean;
  canDispatch: boolean;
  canReceive: boolean;
}) {
  const { data: trf, isLoading } = useTransfer(id);
  const submit = useSubmitTransfer();
  const approve = useApproveTransfer();
  const reject = useRejectTransfer();
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  if (!id) return null;

  const act = async (fn: () => Promise<unknown>, okMsg: string) => {
    try { await fn(); toast.success(okMsg); } catch (e) { toast.error(e instanceof ApiClientError ? e.message : "Action failed"); }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[860px] max-h-[90vh] overflow-y-auto">
        {isLoading ? <SectionLoading /> : trf ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-mono text-base">{trf.code}</DialogTitle>
              <DialogDescription>
                {trf.fromStore?.name} → {trf.toStore?.name} · {formatDate(trf.createdAt, true)}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded border border-border bg-surface-2 px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Status</p>
                <StatusPill status={trf.status} />
              </div>
              <div className="rounded border border-border bg-surface-2 px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Reason</p>
                <p className="text-sm font-semibold truncate">{trf.reason ?? "—"}</p>
              </div>
              <div className="rounded border border-border bg-surface-2 px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Requested By</p>
                <p className="text-sm font-semibold truncate">{trf.requestedBy?.fullName ?? "—"}</p>
              </div>
            </div>
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">Transfer Items</h4>
              <AstuCardTable>
                <table className="astu-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className="text-right">Requested</th>
                      <th className="text-right">Dispatched</th>
                      <th className="text-right">Received</th>
                      <th className="text-right">Shortage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(trf.items ?? []).map((it) => (
                      <tr key={it.id}>
                        <td className="text-sm">{it.item?.name ?? it.itemId}</td>
                        <td className="text-right">{formatNumber(it.quantity)}</td>
                        <td className="text-right">{formatNumber(it.dispatchedQty)}</td>
                        <td className="text-right">{formatNumber(it.receivedQty)}</td>
                        <td className={`text-right font-semibold ${it.dispatchedQty - it.receivedQty > 0 ? "text-danger" : "text-muted-foreground"}`}>
                          {formatNumber(Math.max(0, it.dispatchedQty - it.receivedQty))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AstuCardTable>
              {trf.notes && <p className="mt-2 text-xs text-muted-foreground whitespace-pre-line">{trf.notes}</p>}
            </div>

            <DialogFooter className="border-t border-border pt-4">
              {trf.status === "DRAFT" && (
                <Button onClick={() => act(() => submit.mutateAsync(trf.id), "Transfer submitted")}>Submit</Button>
              )}
              {trf.status === "SUBMITTED" && canApprove && (
                <>
                  <Button variant="outline" className="text-danger border-danger/30" onClick={() => act(() => reject.mutateAsync(trf.id), "Transfer rejected")}>Reject</Button>
                  <Button onClick={() => act(() => approve.mutateAsync(trf.id), "Transfer approved")}>Approve</Button>
                </>
              )}
              {trf.status === "APPROVED" && canDispatch && (
                <Button onClick={() => setDispatchOpen(true)}><PackageCheck className="h-4 w-4" /> Dispatch</Button>
              )}
              {trf.status === "DISPATCHED" && canReceive && (
                <Button onClick={() => setReceiveOpen(true)}><PackageCheck className="h-4 w-4" /> Receive</Button>
              )}
            </DialogFooter>

            {dispatchOpen && (
              <DispatchDialog transfer={trf} onClose={() => setDispatchOpen(false)} onDone={() => setDispatchOpen(false)} />
            )}
            {receiveOpen && (
              <ReceiveDialog transfer={trf} onClose={() => setReceiveOpen(false)} onDone={() => setReceiveOpen(false)} />
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DispatchDialog({ transfer, onClose, onDone }: { transfer: TransferRequest; onClose: () => void; onDone: () => void }) {
  const dispatch = useDispatchTransfer();
  const { data: srcStocks } = useStoreBinStocks(transfer.fromStoreId || null);
  const [alloc, setAlloc] = useState<Record<string, Record<string, number>>>(() => {
    const init: Record<string, Record<string, number>> = {};
    (transfer.items ?? []).forEach((it) => { init[it.itemId] = {}; });
    return init;
  });

  const binsFor = (itemId: string) => (srcStocks?.items ?? []).filter((b) => b.itemId === itemId);

  const remaining = (it) => {
    const used = Object.values(alloc[it.itemId] ?? {}).reduce((s, v) => s + (v || 0), 0);
    return it.quantity - used;
  };

  const autoFill = (itemId: string) => {
    const it = (transfer.items ?? []).find((x) => x.itemId === itemId);
    if (!it) return;
    const bs = binsFor(itemId);
    let left = it.quantity;
    const next: Record<string, number> = {};
    for (const b of bs) {
      const take = Math.min(Number(b.quantity), left);
      if (take > 0) { next[b.binId] = take; left -= take; }
    }
    setAlloc((p) => ({ ...p, [itemId]: next }));
  };

  const onSubmit = async () => {
    const items = (transfer.items ?? []).map((it) => ({
      itemId: it.itemId,
      allocations: Object.entries(alloc[it.itemId] ?? {})
        .filter(([, q]) => q > 0)
        .map(([binId, quantity]) => ({ binId, quantity })),
    })).filter((x) => x.allocations.length > 0);
    if (items.length === 0) { toast.error("Allocate stock to at least one bin"); return; }
    try {
      await dispatch.mutateAsync({ id: transfer.id, items });
      toast.success("Transfer dispatched — source store stock consumed");
      onDone();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Dispatch failed");
    }
  };

  return (
    <div className="border-t border-border pt-4">
      <h4 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">Dispatch stock — allocate source bins</h4>
      <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
        {(transfer.items ?? []).map((it) => (
          <div key={it.id} className="rounded-md border border-border p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">{it.item?.name ?? it.itemId}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Requested {formatNumber(it.quantity)} · Remaining {formatNumber(remaining(it))}</span>
                <Button variant="outline" size="sm" onClick={() => autoFill(it.itemId)}>Auto</Button>
              </div>
            </div>
            <div className="space-y-1.5">
              {binsFor(it.itemId).length === 0 && <p className="text-xs text-muted-foreground">No bin stock found in source store.</p>}
              {binsFor(it.itemId).map((bs) => (
                <div key={bs.id} className="flex items-center gap-2">
                  <span className="flex-1 text-xs">{bs.bin.code} · {bs.bin.name} (on hand {formatNumber(bs.quantity)})</span>
                  <Input
                    type="number" min="0" className="h-8 w-24"
                    value={alloc[it.itemId]?.[bs.binId] ?? ""}
                    onChange={(e) => setAlloc((p) => ({ ...p, [it.itemId]: { ...(p[it.itemId] ?? {}), [bs.binId]: Number(e.target.value) } }))}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={onSubmit} disabled={dispatch.isPending}>{dispatch.isPending ? "Dispatching..." : "Confirm Dispatch"}</Button>
      </div>
    </div>
  );
}

function ReceiveDialog({ transfer, onClose, onDone }: { transfer: TransferRequest; onClose: () => void; onDone: () => void }) {
  const receive = useReceiveTransfer();
  const { data: destStocks } = useStoreBinStocks(transfer.toStoreId || null);
  const [state, setState] = useState<Record<string, { receivedQty: number; bins: Record<string, number> }>>(() => {
    const init: Record<string, { receivedQty: number; bins: Record<string, number> }> = {};
    (transfer.items ?? []).forEach((it) => { init[it.itemId] = { receivedQty: it.dispatchedQty, bins: {} }; });
    return init;
  });

  const binsFor = (itemId: string) => (destStocks?.items ?? []).filter((b) => b.itemId === itemId);

  const onSubmit = async () => {
    const items = (transfer.items ?? []).map((it) => {
      const st = state[it.itemId];
      return {
        itemId: it.itemId,
        receivedQty: st.receivedQty,
        allocations: Object.entries(st.bins).filter(([, q]) => q > 0).map(([binId, quantity]) => ({ binId, quantity })),
      };
    });
    if (items.some((i) => i.receivedQty < 0)) { toast.error("Received quantity cannot be negative"); return; }
    try {
      await receive.mutateAsync({ id: transfer.id, items });
      toast.success("Transfer received — destination store stock updated");
      onDone();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Receive failed");
    }
  };

  return (
    <div className="border-t border-border pt-4">
      <h4 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">Receive stock — confirm quantities and destination bins</h4>
      <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
        {(transfer.items ?? []).map((it) => {
          const st = state[it.itemId];
          const allocated = Object.values(st.bins).reduce((s, v) => s + (v || 0), 0);
          return (
            <div key={it.id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between mb-2 gap-3">
                <p className="text-sm font-medium flex-1">{it.item?.name ?? it.itemId}</p>
                <span className="text-xs text-muted-foreground">Dispatched {formatNumber(it.dispatchedQty)}</span>
                <Label className="text-xs">Received</Label>
                <Input
                  type="number" min="0" className="h-8 w-20"
                  value={st.receivedQty || ""}
                  onChange={(e) => setState((p) => ({ ...p, [it.itemId]: { ...st, receivedQty: Number(e.target.value) } }))}
                />
              </div>
              <div className="space-y-1.5">
                {binsFor(it.itemId).length === 0 && <p className="text-xs text-muted-foreground">No existing bin stock for this item in destination store — new bin stocks will be created.</p>}
                {binsFor(it.itemId).map((bs) => (
                  <div key={bs.id} className="flex items-center gap-2">
                    <span className="flex-1 text-xs">{bs.bin.code} · {bs.bin.name} (on hand {formatNumber(bs.quantity)})</span>
                    <Input
                      type="number" min="0" className="h-8 w-24"
                      value={st.bins[bs.binId] ?? ""}
                      onChange={(e) => setState((p) => ({ ...p, [it.itemId]: { ...st, bins: { ...st.bins, [bs.binId]: Number(e.target.value) } } }))}
                      placeholder="0"
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Allocated {formatNumber(allocated)} of {formatNumber(st.receivedQty)}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={onSubmit} disabled={receive.isPending}>{receive.isPending ? "Receiving..." : "Confirm Receive"}</Button>
      </div>
    </div>
  );
}