"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ClipboardCheck, Plus, Search, Eye, Save, CheckCircle2, Scale, Trash2, AlertTriangle,
} from "lucide-react";
import {
  useStockTakes, useStockTake, useCreateStockTake, useRecordStockTakeCounts,
  useCompleteStockTake, useReconcileStockTake, useDeleteStockTake,
  useStores, usePermissions,
} from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  PageHeader, SectionError, SectionLoading, EmptyState, Pagination, AstuAction,
  AstuCardTable, ResponsiveTable, MobileCard, StatusPill,
} from "@/components/app/section-utils";
import { useUIStore } from "@/stores/ui-store";
import { formatNumber, statusColor, formatDate } from "@/lib/utils/format";
import { toast } from "sonner";

/* Signed variance, shown with its direction — a bare number hides whether the
   store is over or short, which is the only thing anyone reads this column for. */
function Variance({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  if (value === 0) return <span className="text-muted-foreground tabular">0</span>;
  const over = value > 0;
  return (
    <span className={`tabular font-semibold ${over ? "text-success-strong" : "text-danger-strong"}`}>
      {over ? "+" : "−"}{formatNumber(Math.abs(value))}
    </span>
  );
}

export function StockTakesSection() {
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { can } = usePermissions();
  const canCount = can("stocktake.create");

  const notificationTarget = useUIStore((s) => s.notificationTarget);
  const setNotificationTarget = useUIStore((s) => s.setNotificationTarget);
  const setSelectedItemId = useUIStore((s) => s.setSelectedItemId);

  // The notification bell links here with filter "open" when counts are in
  // progress. "OPEN" covers DRAFT and IN_PROGRESS, which is exactly what the
  /* eslint-disable react-hooks/set-state-in-effect */
  // badge counted — filtering on one of them would show fewer rows than promised.
  useLayoutEffect(() => {
    if (notificationTarget === "open") {
      setStatus("OPEN");
      setPage(1);
      setNotificationTarget(null);
  /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [notificationTarget, setNotificationTarget]);

  const { data, isLoading, isError, refetch } = useStockTakes({
    page, limit, search: search || undefined, status: status || undefined,
  });

  return (
    <div>
      <PageHeader
        title="Stock Taking"
        description="Count physical stock, compare it against the books, and post the difference"
        icon={ClipboardCheck}
        action={canCount ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Count
          </Button>
        ) : undefined}
      />

      <Card className="mb-4 p-3 border border-border shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 h-9"
              placeholder="Search by stock take code..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={status || "ALL"} onValueChange={(v) => { setStatus(v === "ALL" ? "" : v); setPage(1); }}>
            <SelectTrigger className="h-9 w-full sm:w-44 text-xs">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="OPEN">Open (draft or counting)</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="IN_PROGRESS">In progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="RECONCILED">Reconciled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? <SectionLoading variant="table" /> :
       isError ? <SectionError message="Failed to load stock takes" onRetry={() => refetch()} /> :
       !data || data.items.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={search || status ? "No stock takes match" : "No stock takes yet"}
          description="A stock take freezes what the system believes is on hand, records what you actually count, then posts the difference to inventory. The SRS requires one at least once a year."
          actionLabel={canCount ? "New Count" : undefined}
          onAction={canCount ? () => setCreateOpen(true) : undefined}
        />
       ) : (
        <ResponsiveTable
          footerAction={canCount ? <AstuAction onClick={() => setCreateOpen(true)}>+ New</AstuAction> : undefined}
          mobileCards={data.items.map((s) => (
            <MobileCard
              key={s.id}
              primary={s.store.name}
              secondary={s.code}
              badge={<StatusPill status={s.status} />}
              meta={[
                { label: "Counted", value: `${s.countedCount} / ${s.itemCount}` },
                { label: "Variances", value: formatNumber(s.varianceCount) },
                { label: "By", value: s.conductedBy.fullName },
                { label: "Started", value: formatDate(s.startDate) },
              ]}
              action={
                <AstuAction onClick={() => setSelectedItemId(s.id)}>
                  <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />Open</span>
                </AstuAction>
              }
            />
          ))}
        >
          <table className="astu-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Store</th>
                <th>Counted</th>
                <th className="text-right">Variances</th>
                <th>Conducted By</th>
                <th>Started</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((s) => (
                <tr key={s.id}>
                  <td className="font-mono text-xs">{s.code}</td>
                  <td className="text-xs">{s.store.name}</td>
                  <td className="text-xs tabular">
                    {s.countedCount} / {s.itemCount}
                    {s.countedCount < s.itemCount && s.status !== "DRAFT" ? (
                      <span className="ml-1 text-warning-strong">·{s.itemCount - s.countedCount} left</span>
                    ) : null}
                  </td>
                  <td className="text-right tabular">
                    {s.varianceCount > 0
                      ? <span className="font-semibold text-warning-strong">{s.varianceCount}</span>
                      : <span className="text-muted-foreground">0</span>}
                  </td>
                  <td className="text-xs">{s.conductedBy.fullName}</td>
                  <td className="text-xs">{formatDate(s.startDate)}</td>
                  <td><Badge variant={statusColor(s.status)} className="text-[10px]">{s.status.replace(/_/g, " ")}</Badge></td>
                  <td>
                    <AstuAction onClick={() => setSelectedItemId(s.id)}>
                      <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />Open</span>
                    </AstuAction>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPage={setPage} />
        </ResponsiveTable>
      )}

      <StockTakeDrawer onDeleted={() => refetch()} />
      <CreateStockTakeDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CreateStockTakeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const stores = useStores();
  const create = useCreateStockTake();
  const setSelectedItemId = useUIStore((s) => s.setSelectedItemId);

  const [storeId, setStoreId] = useState("");
  const [notes, setNotes] = useState("");

  const reset = () => { setStoreId(""); setNotes(""); };

  const onSubmit = async () => {
    if (!storeId) return toast.error("Select the store to count");
    try {
      const take = await create.mutateAsync({ storeId, notes: notes || undefined });
      toast.success(`${take.code} opened — ${take.itemCount} item(s) to count`);
      onOpenChange(false);
      reset();
      // Straight into the count sheet: opening a stock take and then having to
      // find it in the list again is a pointless extra step.
      setSelectedItemId(take.id);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Could not open the stock take");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" /> New Stock Take
          </DialogTitle>
          <DialogDescription>
            Every item the store currently holds is added to the count sheet, with its
            system quantity frozen as of now.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Store *</Label>
            <Select value={storeId} onValueChange={setStoreId}>
              <SelectTrigger><SelectValue placeholder="Select the store to count" /></SelectTrigger>
              <SelectContent>
                {stores.data?.items.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              A store can only have one count open at a time.
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Annual count 2026" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={create.isPending}>
            {create.isPending ? "Opening..." : "Open Count Sheet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StockTakeDrawer({ onDeleted }: { onDeleted: () => void }) {
  const selectedItemId = useUIStore((s) => s.selectedItemId);
  const setSelectedItemId = useUIStore((s) => s.setSelectedItemId);
  const { data: take, isLoading } = useStockTake(selectedItemId);

  const { can, userId } = usePermissions();
  const saveCounts = useRecordStockTakeCounts();
  const complete = useCompleteStockTake();
  const reconcile = useReconcileStockTake();
  const remove = useDeleteStockTake();

  // Draft edits live here until saved, so a mistyped count never hits the server.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  /* eslint-disable react-hooks/set-state-in-effect */

  useLayoutEffect(() => { setDrafts({}); }, [selectedItemId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const open = take?.status === "DRAFT" || take?.status === "IN_PROGRESS";
  const canCount = can("stocktake.create");
  const canApprove = can("stocktake.approve");
  // The counter must not sign off their own count — the server refuses it, so
  // the button is disabled rather than left to fail.
  const isOwnCount = !!take && take.conductedBy.id === userId;

  const close = () => { setSelectedItemId(null); setDrafts({}); };

  const dirtyCounts = useMemo(() => {
    if (!take) return [];
    return take.items.flatMap((line) => {
      const raw = drafts[line.itemId];
      if (raw === undefined || raw === "") return [];
      const physicalQty = Number(raw);
      if (!Number.isFinite(physicalQty) || physicalQty < 0) return [];
      if (physicalQty === line.physicalQty) return [];
      return [{ itemId: line.itemId, physicalQty }];
    });
  }, [take, drafts]);

  const invalidDrafts = Object.values(drafts).some(
    (v) => v !== "" && (!Number.isFinite(Number(v)) || Number(v) < 0)
  );

  const onSave = async () => {
    if (!take) return;
    if (invalidDrafts) return toast.error("A physical count cannot be negative or blank");
    if (!dirtyCounts.length) return toast.info("Nothing changed");
    try {
      await saveCounts.mutateAsync({ id: take.id, counts: dirtyCounts });
      toast.success(`${dirtyCounts.length} count(s) saved`);
      setDrafts({});
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Could not save the counts");
    }
  };

  const onComplete = async () => {
    if (!take) return;
    if (dirtyCounts.length) return toast.error("Save your counts before completing");
    try {
      await complete.mutateAsync(take.id);
      toast.success(`${take.code} completed — ready for reconciliation`);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Could not complete the stock take");
    }
  };

  const onReconcile = async () => {
    if (!take) return;
    try {
      const result = await reconcile.mutateAsync(take.id);
      toast.success(
        result.varianceCount > 0
          ? `${take.code} reconciled — ${result.varianceCount} item(s) adjusted`
          : `${take.code} reconciled — the count matched the books exactly`
      );
      setConfirmReconcile(false);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Could not reconcile the stock take");
    }
  };

  const onDelete = async () => {
    if (!take) return;
    try {
      await remove.mutateAsync(take.id);
      toast.success(`${take.code} deleted`);
      setConfirmDelete(false);
      close();
      onDeleted();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Could not delete the stock take");
    }
  };

  return (
    <>
      <Dialog open={!!selectedItemId} onOpenChange={(v) => !v && close()}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          {isLoading ? <SectionLoading /> : take ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2 font-mono text-base">
                  {take.code}
                  <StatusPill status={take.status} />
                </DialogTitle>
                <DialogDescription>
                  {take.store.name} · counted by {take.conductedBy.fullName} · started {formatDate(take.startDate, true)}
                  {take.endDate ? ` · completed ${formatDate(take.endDate, true)}` : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Items" value={formatNumber(take.itemCount)} />
                <Stat label="Counted" value={`${take.countedCount} / ${take.itemCount}`} />
                <Stat label="Surplus" value={formatNumber(take.surplusQty)} tone={take.surplusQty > 0 ? "success" : undefined} />
                <Stat label="Shortage" value={formatNumber(take.shortageQty)} tone={take.shortageQty > 0 ? "danger" : undefined} />
              </div>

              {take.notes ? (
                <p className="rounded border border-border bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
                  {take.notes}
                </p>
              ) : null}

              {take.status === "COMPLETED" ? (
                <div className="flex items-start gap-2 rounded border border-warning/40 bg-warning-subtle px-3 py-2 text-xs">
                  <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-strong" />
                  <p>
                    Reconciling posts <strong>{take.varianceCount} adjustment(s)</strong> to real stock —
                    {take.surplusQty > 0 ? ` +${formatNumber(take.surplusQty)} found` : ""}
                    {take.surplusQty > 0 && take.shortageQty > 0 ? "," : ""}
                    {take.shortageQty > 0 ? ` −${formatNumber(take.shortageQty)} missing` : ""}
                    {take.varianceCount === 0 ? " nothing to adjust — the count matched" : ""}.
                    This cannot be undone.
                  </p>
                </div>
              ) : null}

              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider">
                  Count Sheet
                  {open && canCount ? (
                    <span className="ml-2 font-normal normal-case text-muted-foreground">
                      — type the quantity you physically counted
                    </span>
                  ) : null}
                </h4>
                <AstuCardTable>
                  <table className="astu-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th className="text-right">System</th>
                        <th className="text-right">Physical</th>
                        <th className="text-right">Variance</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {take.items.map((line) => {
                        const draft = drafts[line.itemId];
                        const shown = draft !== undefined
                          ? draft
                          : line.physicalQty === null ? "" : String(line.physicalQty);
                        const liveVariance = shown === "" || !Number.isFinite(Number(shown))
                          ? line.variance
                          : Number(shown) - line.systemQty;
                        return (
                          <tr key={line.id}>
                            <td>
                              <p className="text-sm font-medium">{line.itemName}</p>
                              <p className="text-xs text-muted-foreground">{line.itemCode} · {line.uom}</p>
                            </td>
                            <td className="text-right tabular">{formatNumber(line.systemQty)}</td>
                            <td className="text-right">
                              {open && canCount ? (
                                <Input
                                  type="number"
                                  step="any"
                                  min="0"
                                  className="h-8 w-24 text-right tabular"
                                  placeholder="—"
                                  value={shown}
                                  onChange={(e) =>
                                    setDrafts((d) => ({ ...d, [line.itemId]: e.target.value }))
                                  }
                                />
                              ) : line.physicalQty === null ? (
                                <span className="text-muted-foreground">not counted</span>
                              ) : (
                                <span className="tabular">{formatNumber(line.physicalQty)}</span>
                              )}
                            </td>
                            <td className="text-right"><Variance value={liveVariance} /></td>
                            <td className="text-xs text-muted-foreground">{line.remarks ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </AstuCardTable>
              </div>

              <DialogFooter className="flex-wrap gap-2">
                {open && canCount ? (
                  <>
                    <Button
                      variant="outline"
                      className="text-danger border-danger/40 hover:bg-danger-subtle"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                    <div className="flex-1" />
                    <Button variant="outline" onClick={onSave} disabled={saveCounts.isPending || !dirtyCounts.length}>
                      <Save className="h-3.5 w-3.5" />
                      {saveCounts.isPending ? "Saving..." : `Save Counts${dirtyCounts.length ? ` (${dirtyCounts.length})` : ""}`}
                    </Button>
                    <Button
                      onClick={onComplete}
                      disabled={complete.isPending || take.countedCount < take.itemCount || !!dirtyCounts.length}
                      title={take.countedCount < take.itemCount ? "Every item must be counted first" : undefined}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {complete.isPending ? "Completing..." : "Complete"}
                    </Button>
                  </>
                ) : take.status === "COMPLETED" ? (
                  <>
                    <Button variant="outline" onClick={close}>Close</Button>
                    <Button
                      onClick={() => setConfirmReconcile(true)}
                      disabled={!canApprove || isOwnCount}
                      title={
                        !canApprove ? "You do not have permission to reconcile a stock take"
                          : isOwnCount ? "You conducted this count — someone else must reconcile it"
                            : undefined
                      }
                    >
                      <Scale className="h-3.5 w-3.5" /> Reconcile
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={close}>Close</Button>
                )}
              </DialogFooter>

              {take.status === "COMPLETED" && isOwnCount ? (
                <p className="text-[10px] text-muted-foreground">
                  You conducted this count, so it must be reconciled by someone else holding the
                  stock take approval permission.
                </p>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmReconcile} onOpenChange={setConfirmReconcile}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-4 w-4" /> Reconcile {take?.code}?
            </DialogTitle>
            <DialogDescription>
              Inventory will be rewritten to match the physical count.
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            {take?.varianceCount
              ? `${take.varianceCount} item(s) will be adjusted, a stock transaction recorded for each, and the FIFO layers updated. This cannot be undone.`
              : "The count matched the books exactly, so no stock will change — the stock take is simply closed."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReconcile(false)}>Cancel</Button>
            <Button onClick={onReconcile} disabled={reconcile.isPending}>
              {reconcile.isPending ? "Reconciling..." : "Reconcile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <AlertTriangle className="h-4 w-4" /> Delete {take?.code}?
            </DialogTitle>
            <DialogDescription>The count sheet and every count on it are discarded.</DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Nothing has been posted to stock yet, so deleting is safe. Once a stock take is
            completed it becomes part of the audit trail and can no longer be removed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Keep</Button>
            <Button
              onClick={onDelete}
              disabled={remove.isPending}
              className="bg-danger hover:bg-danger-strong text-danger-foreground"
            >
              {remove.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" }) {
  const color = tone === "success" ? "text-success-strong" : tone === "danger" ? "text-danger-strong" : "";
  return (
    <div className="rounded border border-border bg-surface-2 px-3 py-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold tabular ${color}`}>{value}</p>
    </div>
  );
}
