"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Plus,
  Search,
  ArrowLeft,
  Play,
  Send,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Eye,
  AlertTriangle,
} from "lucide-react";
import {
  useStockTakes,
  useStockTake,
  useStores,
  useStoreBinStocks,
  useCreateStockTake,
  useAddStockTakeItems,
  useStartStockTake,
  useResumeStockTake,
  useRecordStockTakeCount,
  useSubmitStockTake,
  useReviewStockTake,
  useRecountStockTake,
  useRejectStockTake,
  useApproveStockTake,
  useApproveStockAdjustment,
  usePostStockAdjustment,
  useMe,
} from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AstuAction,
  AstuCardTable,
  PageHeader,
  SectionEmpty,
  SectionError,
  SectionLoading,
  StatCard,
  TabBar,
} from "@/components/app/section-utils";
import { formatDate, formatNumber, statusColor } from "@/lib/utils/format";
import { toast } from "sonner";
import type { StockTake, StockTakeItem } from "@/lib/types";

function varianceTone(v: number | null | undefined) {
  if (v === null || v === undefined) return "text-muted-foreground";
  if (v > 0) return "text-success-strong";
  if (v < 0) return "text-danger-strong";
  return "text-muted-foreground";
}

function summarizeItems(items: StockTakeItem[]) {
  const counted = items.filter((i) => i.physicalQty !== null);
  const positive = counted.filter((i) => (i.variance ?? 0) > 0);
  const negative = counted.filter((i) => (i.variance ?? 0) < 0);
  const zero = counted.filter((i) => (i.variance ?? 0) === 0);
  const totalVariance = counted.reduce((sum, i) => sum + (i.variance ?? 0), 0);
  return { counted: counted.length, positive: positive.length, negative: negative.length, zero: zero.length, totalVariance };
}

export function StockTakesSection() {
  const me = useMe();
  const permissions = useMemo(() => new Set(me.data?.permissions ?? []), [me.data?.permissions]);
  const roles = useMemo(() => new Set(me.data?.roles ?? []), [me.data?.roles]);
  const isAdmin = roles.has("ADMINISTRATOR");

  const canCreate = isAdmin || permissions.has("stocktakes.create");
  const canUpdate = isAdmin || permissions.has("stocktakes.update");
  const canSubmit = isAdmin || permissions.has("stocktakes.submit");
  const canReview = isAdmin || permissions.has("stocktakes.review");
  const canRecount = isAdmin || permissions.has("stocktakes.recount");
  const canApproveAdj = isAdmin || permissions.has("stockadjustments.approve");
  const canPostAdj = isAdmin || permissions.has("stockadjustments.post");

  const [tab, setTab] = useState("takes");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [postConfirmOpen, setPostConfirmOpen] = useState(false);

  const [newStoreId, setNewStoreId] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [selectedBinStockIds, setSelectedBinStockIds] = useState<Set<string>>(new Set());
  const [countDraft, setCountDraft] = useState<Record<string, { physicalQty: string; remarks: string; unitCostOverride: string }>>({});
  const [costOverrides, setCostOverrides] = useState<Record<string, string>>({});

  const stores = useStores();
  const { data: listData, isLoading, isError, refetch } = useStockTakes({
    search: search || undefined,
    status: statusFilter || undefined,
  });
  const detail = useStockTake(selectedId);
  const binStocks = useStoreBinStocks(newStoreId || null);

  const createStockTake = useCreateStockTake();
  const addItems = useAddStockTakeItems();
  const startTake = useStartStockTake();
  const resumeTake = useResumeStockTake();
  const recordCount = useRecordStockTakeCount();
  const submitTake = useSubmitStockTake();
  const reviewTake = useReviewStockTake();
  const recountTake = useRecountStockTake();
  const rejectTake = useRejectStockTake();
  const approveTake = useApproveStockTake();
  const approveAdj = useApproveStockAdjustment();
  const postAdj = usePostStockAdjustment();

  const st = detail.data;
  const summary = st ? summarizeItems(st.items) : null;

  useEffect(() => {
    if (!st) return;
    const draft: typeof countDraft = {};
    for (const item of st.items) {
      const key = `${item.itemId}:${item.binId}`;
      draft[key] = {
        physicalQty: item.physicalQty?.toString() ?? "",
        remarks: item.remarks ?? "",
        unitCostOverride: item.unitCostOverride?.toString() ?? "",
      };
    }
    setCountDraft(draft);
  }, [st?.id, st?.updatedAt]);

  const resetCreate = () => {
    setNewStoreId("");
    setNewNotes("");
    setSelectedBinStockIds(new Set());
  };

  const handleCreate = async () => {
    if (!newStoreId) {
      toast.error("Select a store");
      return;
    }
    if (selectedBinStockIds.size === 0) {
      toast.error("Select at least one item/bin to count");
      return;
    }
    try {
      const created = await createStockTake.mutateAsync({ storeId: newStoreId, notes: newNotes || undefined });
      const items = (binStocks.data?.items ?? [])
        .filter((bs) => selectedBinStockIds.has(bs.id))
        .map((bs) => ({ itemId: bs.itemId, binId: bs.binId }));
      await addItems.mutateAsync({ id: created.id, items });
      toast.success("Stock take created");
      setCreateOpen(false);
      resetCreate();
      setSelectedId(created.id);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to create stock take");
    }
  };

  const handleSaveCounts = async () => {
    if (!st) return;
    const items = st.items.map((item) => {
      const key = `${item.itemId}:${item.binId}`;
      const draft = countDraft[key];
      return {
        itemId: item.itemId,
        binId: item.binId,
        physicalQty: Number(draft?.physicalQty ?? 0),
        remarks: draft?.remarks || undefined,
        unitCostOverride: draft?.unitCostOverride ? Number(draft.unitCostOverride) : undefined,
      };
    });
    try {
      await recordCount.mutateAsync({ id: st.id, items });
      toast.success("Counts saved");
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to save counts");
    }
  };

  const handleApproveAdjustment = async () => {
    if (!st?.adjustment) return;
    const items = st.adjustment.items
      .filter((i) => i.variance > 0)
      .map((i) => {
        const key = `${i.itemId}:${i.binId}`;
        const override = costOverrides[key];
        return {
          itemId: i.itemId,
          binId: i.binId,
          unitCost: override ? Number(override) : undefined,
        };
      });
    try {
      await approveAdj.mutateAsync({ id: st.adjustment.id, items });
      toast.success("Adjustment approved");
      detail.refetch();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to approve adjustment");
    }
  };

  const handlePostAdjustment = async () => {
    if (!st?.adjustment) return;
    try {
      await postAdj.mutateAsync(st.adjustment.id);
      toast.success("Adjustment posted — stock and ledgers updated");
      setPostConfirmOpen(false);
      detail.refetch();
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to post adjustment");
    }
  };

  if (selectedId && st) {
    return (
      <div>
        <PageHeader
          title={st.code}
          description={`${st.store.name} · ${st.status.replace(/_/g, " ")}`}
          icon={ClipboardList}
          action={
            <Button variant="outline" size="sm" onClick={() => setSelectedId(null)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          }
        />

        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Items" value={String(st.items.length)} icon={ClipboardList} />
          <StatCard label="Positive variance" value={String(summary?.positive ?? 0)} trend={{ dir: "up", value: "surplus" }} />
          <StatCard label="Negative variance" value={String(summary?.negative ?? 0)} trend={{ dir: "down", value: "shortage" }} />
          <StatCard label="Net variance" value={formatNumber(summary?.totalVariance ?? 0)} />
        </div>

        <Card className="mb-4 border border-border p-4 shadow-sm">
          <div className="grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-4">
            <div><span className="text-muted-foreground">Counter:</span> {st.conductedBy.fullName}</div>
            <div><span className="text-muted-foreground">Started:</span> {formatDate(st.startDate)}</div>
            <div><span className="text-muted-foreground">Created:</span> {formatDate(st.createdAt)}</div>
            {st.notes && <div className="md:col-span-2"><span className="text-muted-foreground">Notes:</span> {st.notes}</div>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {st.status === "DRAFT" && canUpdate && (
              <Button size="sm" onClick={() => startTake.mutateAsync(st.id).then(() => detail.refetch()).catch((e) => toast.error(e.message))}>
                <Play className="h-4 w-4" /> Start counting
              </Button>
            )}
            {(st.status === "IN_PROGRESS" || st.status === "RECOUNT_REQUIRED") && canUpdate && (
              <>
                {st.status === "RECOUNT_REQUIRED" && (
                  <Button size="sm" variant="outline" onClick={() => resumeTake.mutateAsync(st.id).then(() => detail.refetch())}>
                    <RotateCcw className="h-4 w-4" /> Resume counting
                  </Button>
                )}
                <Button size="sm" onClick={handleSaveCounts} disabled={recordCount.isPending}>
                  Save counts
                </Button>
                {canSubmit && (
                  <Button size="sm" onClick={() => submitTake.mutateAsync(st.id).then(() => detail.refetch()).catch((e) => toast.error(e.message))}>
                    <Send className="h-4 w-4" /> Submit
                  </Button>
                )}
              </>
            )}
            {(st.status === "SUBMITTED" || st.status === "UNDER_REVIEW") && canReview && (
              <>
                {st.status === "SUBMITTED" && (
                  <Button size="sm" variant="outline" onClick={() => reviewTake.mutateAsync(st.id).then(() => detail.refetch())}>
                    <Eye className="h-4 w-4" /> Mark under review
                  </Button>
                )}
                <Button size="sm" onClick={() => approveTake.mutateAsync(st.id).then(() => detail.refetch()).catch((e) => toast.error(e.message))}>
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => rejectTake.mutateAsync(st.id).then(() => detail.refetch())}>
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
                {canRecount && (
                  <Button size="sm" variant="outline" onClick={() => recountTake.mutateAsync(st.id).then(() => detail.refetch())}>
                    <RotateCcw className="h-4 w-4" /> Request recount
                  </Button>
                )}
              </>
            )}
          </div>
        </Card>

        <AstuCardTable>
          <div className="overflow-x-auto">
            <table className="astu-table min-w-[720px]">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Bin</th>
                  <th className="text-right">System</th>
                  <th className="text-right">Physical</th>
                  <th className="text-right">Variance</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {st.items.map((item) => {
                  const key = `${item.itemId}:${item.binId}`;
                  const editable = st.status === "IN_PROGRESS" || st.status === "RECOUNT_REQUIRED";
                  const draft = countDraft[key] ?? { physicalQty: "", remarks: "", unitCostOverride: "" };
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="font-medium text-xs">{item.item.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{item.item.code}</div>
                      </td>
                      <td className="text-xs">{item.bin.code} · {item.bin.name}</td>
                      <td className="text-right font-mono text-xs">{item.systemQty ?? "—"}</td>
                      <td className="text-right">
                        {editable ? (
                          <Input
                            className="ml-auto h-8 w-24 text-right font-mono text-xs"
                            type="number"
                            min={0}
                            value={draft.physicalQty}
                            onChange={(e) => setCountDraft((prev) => ({ ...prev, [key]: { ...draft, physicalQty: e.target.value } }))}
                          />
                        ) : (
                          <span className="font-mono text-xs">{item.physicalQty ?? "—"}</span>
                        )}
                      </td>
                      <td className={`text-right font-mono text-xs font-semibold ${varianceTone(item.variance)}`}>
                        {item.variance ?? "—"}
                      </td>
                      <td>
                        {editable ? (
                          <Input
                            className="h-8 text-xs"
                            value={draft.remarks}
                            placeholder="Remarks"
                            onChange={(e) => setCountDraft((prev) => ({ ...prev, [key]: { ...draft, remarks: e.target.value } }))}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">{item.remarks ?? "—"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AstuCardTable>

        {st.adjustment && (
          <Card className="mt-4 border border-border p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">Stock Adjustment · {st.adjustment.code}</h3>
                <p className="text-xs text-muted-foreground">Status: {st.adjustment.status}</p>
              </div>
              <Badge variant={statusColor(st.adjustment.status) as "default" | "secondary" | "destructive"}>{st.adjustment.status}</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="astu-table min-w-[640px]">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Bin</th>
                    <th>Direction</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Unit cost</th>
                  </tr>
                </thead>
                <tbody>
                  {st.adjustment.items.map((line) => {
                    const key = `${line.itemId}:${line.binId}`;
                    const needsCost = line.variance > 0 && !line.unitCost;
                    return (
                      <tr key={line.id}>
                        <td className="text-xs">{line.item.code}</td>
                        <td className="text-xs">{line.bin.code}</td>
                        <td>
                          <Badge variant={line.variance > 0 ? "default" : "destructive"}>
                            {line.variance > 0 ? "IN" : "OUT"}
                          </Badge>
                        </td>
                        <td className="text-right font-mono text-xs">{Math.abs(line.variance)}</td>
                        <td className="text-right">
                          {line.variance > 0 && st.adjustment?.status === "DRAFT" && canApproveAdj ? (
                            <Input
                              className="ml-auto h-8 w-28 text-right text-xs"
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder={needsCost ? "Required" : "Override"}
                              value={costOverrides[key] ?? line.unitCost?.toString() ?? ""}
                              onChange={(e) => setCostOverrides((prev) => ({ ...prev, [key]: e.target.value }))}
                            />
                          ) : (
                            <span className="font-mono text-xs">{line.unitCost ?? (line.variance > 0 ? "Auto" : "FIFO")}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {st.adjustment.status === "DRAFT" && canApproveAdj && (
                <>
                  <Button size="sm" onClick={handleApproveAdjustment} disabled={approveAdj.isPending}>
                    Approve adjustment
                  </Button>
                </>
              )}
              {st.adjustment.status === "APPROVED" && canPostAdj && (
                <Button size="sm" onClick={() => setPostConfirmOpen(true)}>
                  Post adjustment
                </Button>
              )}
            </div>
          </Card>
        )}

        <Dialog open={postConfirmOpen} onOpenChange={setPostConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Post stock adjustment?</DialogTitle>
              <DialogDescription>
                This action will update physical stock, FIFO layers, and inventory ledgers using variance deltas against current stock.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border border-warning/30 bg-warning-subtle p-3 text-sm">
              <AlertTriangle className="mb-1 inline h-4 w-4 text-warning-strong" />{" "}
              {st.adjustment?.items.length ?? 0} line(s) will be applied atomically.
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPostConfirmOpen(false)}>Cancel</Button>
              <Button onClick={handlePostAdjustment} disabled={postAdj.isPending}>Confirm post</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Stock Takes"
        description="Physical inventory counting, variance review, and stock adjustments"
        icon={ClipboardList}
        action={
          canCreate ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New stock take
            </Button>
          ) : undefined
        }
      />

      <TabBar
        tabs={[
          { id: "takes", label: "Stock Takes" },
          { id: "adjustments", label: "Adjustments" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <Card className="mb-4 p-3 border border-border shadow-sm">
        <div className="grid gap-2 md:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8 h-9" placeholder="Search code or notes..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter || "ALL"} onValueChange={(v) => setStatusFilter(v === "ALL" ? "" : v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {["DRAFT", "IN_PROGRESS", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "RECOUNT_REQUIRED", "REJECTED", "RECONCILED"].map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? <SectionLoading /> :
       isError ? <SectionError message="Failed to load stock takes" onRetry={() => refetch()} /> :
       !listData?.items.length ? <SectionEmpty title="No stock takes yet" message="Create a stock take to begin physical counting" action={canCreate ? <Button size="sm" onClick={() => setCreateOpen(true)}>New stock take</Button> : undefined} /> : (
        <AstuCardTable footerAction={canCreate ? <AstuAction onClick={() => setCreateOpen(true)}>+ New</AstuAction> : undefined}>
          <div className="overflow-x-auto">
            <table className="astu-table min-w-[760px]">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Store</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th>Variance</th>
                  <th>Started</th>
                  <th>Counter</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {listData.items.map((row: StockTake) => {
                  const s = summarizeItems(row.items);
                  return (
                    <tr key={row.id}>
                      <td className="font-mono text-xs">{row.code}</td>
                      <td className="text-xs">{row.store.name}</td>
                      <td><Badge variant={statusColor(row.status) as "default" | "secondary" | "destructive"}>{row.status.replace(/_/g, " ")}</Badge></td>
                      <td className="text-xs">{row.items.length}</td>
                      <td className={`text-xs font-semibold ${varianceTone(s.totalVariance)}`}>{formatNumber(s.totalVariance)}</td>
                      <td className="text-xs">{formatDate(row.startDate)}</td>
                      <td className="text-xs">{row.conductedBy.fullName}</td>
                      <td>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedId(row.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AstuCardTable>
      )}

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreate(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create stock take</DialogTitle>
            <DialogDescription>Select a store and the item/bin combinations to count.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Store</Label>
              <Select value={newStoreId} onValueChange={(v) => { setNewStoreId(v); setSelectedBinStockIds(new Set()); }}>
                <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                <SelectContent>
                  {(stores.data?.items ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Optional count instructions" />
            </div>
            {newStoreId && (
              <div>
                <Label>Items to count ({selectedBinStockIds.size} selected)</Label>
                <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-border">
                  {(binStocks.data?.items ?? []).length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground">No bin stock records in this store yet.</p>
                  ) : (
                    binStocks.data!.items.map((bs) => (
                      <label key={bs.id} className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-2 text-xs last:border-0 hover:bg-surface-2">
                        <input
                          type="checkbox"
                          checked={selectedBinStockIds.has(bs.id)}
                          onChange={(e) => {
                            setSelectedBinStockIds((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(bs.id);
                              else next.delete(bs.id);
                              return next;
                            });
                          }}
                        />
                        <span className="flex-1">{bs.item.code} · {bs.item.name}</span>
                        <span className="text-muted-foreground">{bs.bin.code}</span>
                        <span className="font-mono">{bs.quantity}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createStockTake.isPending || addItems.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
