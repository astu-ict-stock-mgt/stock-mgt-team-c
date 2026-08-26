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