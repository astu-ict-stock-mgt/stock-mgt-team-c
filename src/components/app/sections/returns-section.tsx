// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { Plus, Undo2, X, Eye } from "lucide-react";
import {
  useReturns, useReturn, useStores, useStoreBinStocks, useInventory, useIssues,
  useCreateReturn, useSubmitReturn, useEvaluateReturn, useApproveReturn,
  useRejectReturn, useReceiveReturn, useMe,
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
import type { StoreReturn } from "@/lib/types";

export function ReturnsSection() {
  const me = useMe();
  const permissions = useMemo(() => new Set(me.data?.permissions ?? []), [me.data?.permissions]);
  const roles = useMemo(() => new Set(me.data?.roles ?? []), [me.data?.roles]);
  const isAdmin = roles.has("ADMINISTRATOR");

  const { data, isLoading, isError, refetch } = useReturns();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const canCreate = isAdmin || permissions.has("returns.create");
  const canEvaluate = isAdmin || permissions.has("returns.evaluate");
  const canApprove = isAdmin || permissions.has("returns.approve");
  const canReceive = isAdmin || permissions.has("returns.receive");

  return (
    <div>
      <PageHeader
        title="Stock Returns"
        description="Return stock issued to departments — original issue cost is preserved and FIFO integrity maintained"
        icon={Undo2}
        action={canCreate && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Return
          </Button>
        )}
      />

      {isLoading ? <SectionLoading /> :
       isError ? <SectionError message="Failed to load returns" onRetry={() => refetch()} /> :
       !data || data.length === 0 ? <SectionEmpty title="No stock returns yet" message="Create a return to bring issued stock back into the store" /> :
        <AstuCardTable>
          <table className="astu-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Store</th>
                <th>Department</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-xs">{r.code}</td>
                  <td className="text-xs">{r.store?.name ?? "—"}</td>
                  <td className="text-xs">{r.department ?? "—"}</td>
                  <td className="text-xs">{formatDate(r.createdAt)}</td>
                  <td><StatusPill status={r.status} /></td>
                  <td>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedId(r.id)}>
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
        <CreateReturnDialog onClose={() => setCreateOpen(false)} onCreated={(id) => { setCreateOpen(false); setSelectedId(id); }} />
      )}

      <ReturnDetailDialog
        id={selectedId}
        onClose={() => setSelectedId(null)}
        canEvaluate={canEvaluate}
        canApprove={canApprove}
        canReceive={canReceive}
      />
    </div>
  );
}

function CreateReturnDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { data: stores } = useStores();
  const { data: inventory } = useInventory({ page: 1, limit: 200 });
  const { data: issues } = useIssues({ page: 1, limit: 100 });
  const create = useCreateReturn();
  const [storeId, setStoreId] = useState("");
  const [department, setDepartment] = useState("");
  const [originalSivId, setOriginalSivId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Array<{ itemId: string; quantity: number; reason: string }>>([{ itemId: "", quantity: 1, reason: "" }]);

  const addLine = () => setLines((p) => [...p, { itemId: "", quantity: 1, reason: "" }]);
  const updateLine = (idx: number, patch: Partial<{ itemId: string; quantity: number; reason: string }>) =>
    setLines((p) => p.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const removeLine = (idx: number) => setLines((p) => p.filter((_, i) => i !== idx));

  const canSubmit = storeId && department.trim() && lines.length > 0 && lines.every((l) => l.itemId && l.quantity > 0);

  const onSubmit = async () => {
    if (!canSubmit) { toast.error("Select a store, enter the department and add at least one item"); return; }
    try {
      const srn = await create.mutateAsync({
        storeId,
        department,
        originalSivId: originalSivId || undefined,
        notes: notes || undefined,
        items: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, reason: l.reason || undefined, condition: undefined })),
      });
      toast.success("Return created");
      onCreated(srn.id);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to create return");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New stock return</DialogTitle>
          <DialogDescription>Return stock to the store — optionally reference the original issue voucher.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Store *</Label>
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger><SelectValue placeholder="Store" /></SelectTrigger>
                <SelectContent>
                  {(stores?.items ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Department *</Label>
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. IT" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Original issue (optional)</Label>
              <Select value={originalSivId} onValueChange={setOriginalSivId}>
                <SelectTrigger><SelectValue placeholder="Select issue voucher" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— No original issue —</SelectItem>
                  {(issues?.items ?? []).map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.code} · {i.department}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Returned items ({lines.length})</Label>
              <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-3.5 w-3.5" /> Add</Button>
            </div>
            <div className="space-y-2">
              {lines.map((l, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Select value={l.itemId} onValueChange={(v) => updateLine(idx, { itemId: v })}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Item" /></SelectTrigger>
                    <SelectContent>
                      {(inventory?.items ?? []).map((it) => (
                        <SelectItem key={it.id} value={it.id}>{it.code} · {it.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number" min="1" className="w-20" placeholder="Qty"
                    value={l.quantity || ""}
                    onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })}
                  />
                  <Input
                    className="w-40" placeholder="Reason"
                    value={l.reason}
                    onChange={(e) => updateLine(idx, { reason: e.target.value })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeLine(idx)}><X className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit} disabled={create.isPending}>{create.isPending ? "Creating..." : "Create Return"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReturnDetailDialog({ id, onClose, canEvaluate, canApprove, canReceive }: {
  id: string | null;
  onClose: () => void;
  canEvaluate: boolean;
  canApprove: boolean;
  canReceive: boolean;
}) {
  const { data: srn, isLoading } = useReturn(id);
  const submit = useSubmitReturn();
  const evaluate = useEvaluateReturn();
  const approve = useApproveReturn();
  const reject = useRejectReturn();
  const receive = useReceiveReturn();
  const { data: storeStocks } = useStoreBinStocks(srn?.storeId ?? null);

  const [accepted, setAccepted] = useState<Record<string, number>>({});
  const [alloc, setAlloc] = useState<Record<string, Record<string, number>>>({});
  const [busy, setBusy] = useState(false);

  if (!id) return null;

  const act = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    try { await fn(); toast.success(okMsg); } catch (e) { toast.error(e instanceof ApiClientError ? e.message : "Action failed"); }
    setBusy(false);
  };

  const onEvaluate = async (r: StoreReturn) => {
    const items = (r.items ?? []).map((it) => ({
      itemId: it.itemId,
      acceptedQty: Number(accepted[it.itemId] ?? it.quantity),
    }));
    await act(() => evaluate.mutateAsync({ id: r.id, items }), "Return evaluated");
  };

  const onReceive = async (r: StoreReturn) => {
    setBusy(true);
    try {
      const items = (r.items ?? [])
        .filter((it) => (it.acceptedQty ?? it.quantity) > 0)
        .map((it) => ({
          itemId: it.itemId,
          allocations: Object.entries(alloc[it.itemId] ?? {})
            .filter(([, q]) => q > 0)
            .map(([binId, quantity]) => ({ binId, quantity })),
        }));
      if (items.length === 0) { toast.error("Allocate stock to at least one bin"); return; }
      await receive.mutateAsync({ id: r.id, items });
      toast.success("Return received — stock and FIFO layer created");
      setBusy(false);
    } catch (e) { setBusy(false); toast.error(e instanceof ApiClientError ? e.message : "Receive failed"); }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[860px] max-h-[90vh] overflow-y-auto">
        {isLoading ? <SectionLoading /> : srn ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-mono text-base">{srn.code}</DialogTitle>
              <DialogDescription>
                {srn.store?.name ?? "Store"} · {srn.department ?? "—"} · {formatDate(srn.createdAt, true)}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded border border-border bg-surface-2 px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Status</p>
                <StatusPill status={srn.status} />
              </div>
              <div className="rounded border border-border bg-surface-2 px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Items</p>
                <p className="text-sm font-semibold">{srn.items?.length ?? 0}</p>
              </div>
              <div className="rounded border border-border bg-surface-2 px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Original Issue</p>
                <p className="text-sm font-semibold truncate">{srn.originalSivId ? "Linked" : "—"}</p>
              </div>
            </div>
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">Returned Items</h4>
              <AstuCardTable>
                <table className="astu-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Reason</th>
                      <th className="text-right">Returned Qty</th>
                      <th className="text-right">Accepted Qty</th>
                      {(srn.status === "SUBMITTED" || srn.status === "UNDER_EVALUATION") && canEvaluate && <th>Evaluate</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(srn.items ?? []).map((it) => (
                      <tr key={it.id}>
                        <td className="text-sm">{it.itemName ?? it.itemId}</td>
                        <td className="text-xs">{it.reason ?? "—"}</td>
                        <td className="text-right">{formatNumber(it.quantity)}</td>
                        <td className="text-right font-semibold">{it.acceptedQty !== null ? formatNumber(it.acceptedQty) : "—"}</td>
                        {(srn.status === "SUBMITTED" || srn.status === "UNDER_EVALUATION") && canEvaluate && (
                          <td>
                            <Input
                              type="number" min="0" className="h-8 w-28"
                              value={accepted[it.itemId] ?? it.quantity}
                              onChange={(e) => setAccepted((p) => ({ ...p, [it.itemId]: Number(e.target.value) }))}
                            />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AstuCardTable>
            </div>

            {(srn.status === "APPROVED") && canReceive && (
              <div className="mb-4 rounded-md border border-border p-3">
                <h4 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">Receive — allocate destination bins</h4>
                <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                  {(srn.items ?? []).filter((it) => (it.acceptedQty ?? it.quantity) > 0).map((it) => (
                    <div key={it.id} className="rounded border border-border p-2">
                      <p className="text-xs font-semibold mb-1">{it.itemName ?? it.itemId} — accepted {formatNumber(it.acceptedQty ?? it.quantity)}</p>
                      {(storeStocks?.items ?? []).filter((bs) => bs.itemId === it.itemId).map((bs) => (
                        <div key={bs.id} className="flex items-center gap-2">
                          <span className="flex-1 text-xs">{bs.bin.code} · {bs.bin.name}</span>
                          <Input
                            type="number" min="0" className="h-8 w-24"
                            value={alloc[it.itemId]?.[bs.binId] ?? ""}
                            onChange={(e) => setAlloc((p) => ({ ...p, [it.itemId]: { ...(p[it.itemId] ?? {}), [bs.binId]: Number(e.target.value) } }))}
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="border-t border-border pt-4">
              {srn.status === "DRAFT" && (
                <Button onClick={() => act(() => submit.mutateAsync(srn.id), "Return submitted")} disabled={busy}>Submit</Button>
              )}
              {srn.status === "SUBMITTED" && canEvaluate && (
                <Button onClick={() => onEvaluate(srn)} disabled={busy}>Evaluate & Accept</Button>
              )}
              {srn.status === "UNDER_EVALUATION"             && canApprove && (
                <>
                  <Button variant="outline" className="text-danger border-danger/30" onClick={() => act(() => reject.mutateAsync(srn.id), "Return rejected")} disabled={busy}>Reject</Button>
                  <Button onClick={() => act(() => approve.mutateAsync(srn.id), "Return approved")} disabled={busy}>Approve</Button>
                </>
              )}
              {srn.status === "APPROVED" && canReceive && (
                <Button onClick={() => onReceive(srn)} disabled={busy}>{busy ? "Receiving..." : "Receive Return"}</Button>
              )}
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}