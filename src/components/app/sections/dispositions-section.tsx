"use client";

import { useState } from "react";
import {
  AlertOctagon, Archive, Plus, Search, CheckCircle2, Trash2, XCircle, ShieldCheck,
} from "lucide-react";
import {
  useDispositions, useReportDisposition, useApproveDisposition,
  useDisposeDisposition, useCancelDisposition,
  useStores, useInventory, usePermissions,
} from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import type { Disposition, DispositionKind } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  PageHeader, SectionError, SectionLoading, EmptyState, Pagination, AstuAction,
  ResponsiveTable, MobileCard, StatusPill,
} from "@/components/app/section-utils";
import { formatNumber, statusColor, formatDate } from "@/lib/utils/format";
import { toast } from "sonner";

/**
 * Damaged and obsolete stock share one screen with two tabs — the two backends are
 * the same shape, so duplicating this component would only create drift.
 *
 * The lifecycle is report → approve → dispose. Nothing leaves stock until the
 * disposal step: a broken crate is still on the shelf and still on the books.
 */

const TABS: Array<{ kind: DispositionKind; label: string; icon: typeof AlertOctagon; permission: string }> = [
  { kind: "damaged", label: "Damaged", icon: AlertOctagon, permission: "damaged.manage" },
  { kind: "obsolete", label: "Obsolete", icon: Archive, permission: "obsolete.manage" },
];

const COPY: Record<DispositionKind, { title: string; blurb: string; empty: string; verb: string }> = {
  damaged: {
    title: "Damaged Stock",
    blurb: "Report broken or unusable goods, get the disposal approved, then write them off",
    empty: "Report goods that have been broken or spoiled. Nothing leaves stock until the disposal is approved and carried out.",
    verb: "damaged",
  },
  obsolete: {
    title: "Obsolete Stock",
    blurb: "Report goods that are too old or no longer usable, get approval, then write them off",
    empty: "Report goods that are past their useful life. Nothing leaves stock until the disposal is approved and carried out.",
    verb: "obsolete",
  },
};

export function DispositionsSection() {
  const { can, canAny } = usePermissions();
  // Land on whichever tab the user can actually use.
  const [kind, setKind] = useState<DispositionKind>(
    can("damaged.manage") || !can("obsolete.manage") ? "damaged" : "obsolete"
  );

  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [disposing, setDisposing] = useState<Disposition | null>(null);
  const [cancelling, setCancelling] = useState<Disposition | null>(null);

  const copy = COPY[kind];
  const canManage = can(kind === "damaged" ? "damaged.manage" : "obsolete.manage");

  const { data, isLoading, isError, refetch } = useDispositions(kind, {
    page, limit, search: search || undefined, status: status || undefined,
  });

  const approve = useApproveDisposition(kind);
  const cancel = useCancelDisposition(kind);

  const switchTab = (next: DispositionKind) => {
    setKind(next);
    setPage(1);
    setSearch("");
    setStatus("");
  };

  const onApprove = async (row: Disposition) => {
    try {
      await approve.mutateAsync(row.id);
      toast.success(`Disposal of ${row.quantity} × ${row.item.code} approved`);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Could not approve");
    }
  };

  const onCancel = async () => {
    if (!cancelling) return;
    try {
      await cancel.mutateAsync(cancelling.id);
      toast.success(`Record for ${cancelling.item.code} cancelled`);
      setCancelling(null);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Could not cancel");
    }
  };

  if (!canAny("damaged.manage", "obsolete.manage")) {
    return (
      <EmptyState
        icon={AlertOctagon}
        title="No access"
        description="Managing damaged and obsolete stock needs the damaged or obsolete permission."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={copy.title}
        description={copy.blurb}
        icon={kind === "damaged" ? AlertOctagon : Archive}
        action={canManage ? (
          <Button size="sm" onClick={() => setReportOpen(true)}>
            <Plus className="h-4 w-4" /> Report {kind === "damaged" ? "Damage" : "Obsolete"}
          </Button>
        ) : undefined}
      />

      {/* Tab switch */}
      <div className="mb-4 inline-flex rounded-md border border-border bg-surface-2 p-0.5">
        {TABS.filter((t) => can(t.permission)).map((t) => {
          const Icon = t.icon;
          const active = t.kind === kind;
          return (
            <button
              key={t.kind}
              onClick={() => switchTab(t.kind)}
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      <Card className="mb-4 p-3 border border-border shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 h-9"
              placeholder="Search by item or reason..."
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
              <SelectItem value="REPORTED">Reported</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="DISPOSED">Disposed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? <SectionLoading variant="table" /> :
       isError ? <SectionError message={`Failed to load ${copy.verb} stock`} onRetry={() => refetch()} /> :
       !data || data.items.length === 0 ? (
        <EmptyState
          icon={kind === "damaged" ? AlertOctagon : Archive}
          title={search || status ? "Nothing matches" : `No ${copy.verb} stock recorded`}
          description={copy.empty}
          actionLabel={canManage ? `Report ${kind === "damaged" ? "Damage" : "Obsolete"}` : undefined}
          onAction={canManage ? () => setReportOpen(true) : undefined}
        />
       ) : (
        <ResponsiveTable
          footerAction={canManage ? <AstuAction onClick={() => setReportOpen(true)}>+ Report</AstuAction> : undefined}
          mobileCards={data.items.map((r) => (
            <MobileCard
              key={r.id}
              primary={`${formatNumber(r.quantity)} × ${r.item.name}`}
              secondary={r.reason}
              badge={<StatusPill status={r.status} />}
              meta={[
                { label: "Item", value: r.item.code },
                { label: "Store", value: r.store?.name ?? "—" },
                { label: "By", value: r.reportedBy?.fullName ?? "—" },
                { label: "Reported", value: formatDate(r.createdAt) },
              ]}
              action={
                <RowActions
                  row={r} canManage={canManage}
                  onApprove={() => onApprove(r)}
                  onDispose={() => setDisposing(r)}
                  onCancel={() => setCancelling(r)}
                  pending={approve.isPending}
                />
              }
            />
          ))}
        >
          <table className="astu-table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="text-right">Qty</th>
                <th>Store</th>
                <th>Reason</th>
                <th>Reported By</th>
                <th>Reported</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id}>
                  <td>
                    <p className="text-sm font-medium">{r.item.name}</p>
                    <p className="text-xs text-muted-foreground">{r.item.code} · {r.item.uom}</p>
                  </td>
                  <td className="text-right font-semibold tabular">{formatNumber(r.quantity)}</td>
                  <td className="text-xs">{r.store?.name ?? "—"}</td>
                  <td className="max-w-[220px] text-xs">
                    <span className="line-clamp-2">{r.reason}</span>
                    {r.disposalMethod ? (
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        Disposed by {r.disposalMethod}
                      </span>
                    ) : null}
                  </td>
                  <td className="text-xs">{r.reportedBy?.fullName ?? "—"}</td>
                  <td className="text-xs">{formatDate(r.createdAt)}</td>
                  <td><Badge variant={statusColor(r.status)} className="text-[10px]">{r.status}</Badge></td>
                  <td>
                    <RowActions
                      row={r} canManage={canManage}
                      onApprove={() => onApprove(r)}
                      onDispose={() => setDisposing(r)}
                      onCancel={() => setCancelling(r)}
                      pending={approve.isPending}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPage={setPage} />
        </ResponsiveTable>
      )}

      <ReportDialog kind={kind} open={reportOpen} onOpenChange={setReportOpen} />
      <DisposeDialog kind={kind} row={disposing} onClose={() => setDisposing(null)} />

      <Dialog open={!!cancelling} onOpenChange={(v) => !v && setCancelling(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-4 w-4" /> Cancel this record?
            </DialogTitle>
            <DialogDescription>
              {cancelling ? `${formatNumber(cancelling.quantity)} × ${cancelling.item.code}` : ""}
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            The goods stay on the books. Use this when the report was raised in error or the
            item turned out to be usable after all.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelling(null)}>Keep</Button>
            <Button onClick={onCancel} disabled={cancel.isPending}>
              {cancel.isPending ? "Cancelling..." : "Cancel Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RowActions({
  row, canManage, onApprove, onDispose, onCancel, pending,
}: {
  row: Disposition;
  canManage: boolean;
  onApprove: () => void;
  onDispose: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  if (!canManage) return <span className="text-xs text-muted-foreground">—</span>;

  if (row.status === "REPORTED") {
    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        <AstuAction variant="primary" onClick={pending ? undefined : onApprove}>
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Approve</span>
        </AstuAction>
        <AstuAction variant="danger" onClick={onCancel}>Cancel</AstuAction>
      </span>
    );
  }
  if (row.status === "APPROVED") {
    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        <AstuAction variant="danger" onClick={onDispose}>
          <span className="inline-flex items-center gap-1"><Trash2 className="h-3 w-3" />Dispose</span>
        </AstuAction>
        <AstuAction onClick={onCancel}>Cancel</AstuAction>
      </span>
    );
  }
  if (row.status === "DISPOSED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ShieldCheck className="h-3 w-3" />
        {row.disposalDate ? formatDate(row.disposalDate) : "written off"}
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">—</span>;
}

function ReportDialog({
  kind, open, onOpenChange,
}: { kind: DispositionKind; open: boolean; onOpenChange: (v: boolean) => void }) {
  const stores = useStores();
  const inventory = useInventory({ page: 1, limit: 100 });
  const report = useReportDisposition(kind);

  const [itemId, setItemId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");

  const reset = () => { setItemId(""); setStoreId(""); setQuantity("1"); setReason(""); };

  const onSubmit = async () => {
    const qty = Number(quantity);
    if (!itemId) return toast.error("Select the item");
    if (!storeId) return toast.error("Select the store holding it");
    if (!Number.isFinite(qty) || qty <= 0) return toast.error("Quantity must be greater than zero");
    if (reason.trim().length < 3) return toast.error("Give a reason of at least 3 characters");

    try {
      const row = await report.mutateAsync({ itemId, storeId, quantity: qty, reason: reason.trim() });
      toast.success(`${formatNumber(row.quantity)} × ${row.item.code} flagged as ${kind}`);
      onOpenChange(false);
      reset();
    } catch (e) {
      // The server refuses a quantity larger than what the store holds, net of
      // anything already awaiting disposal — surface that message as written.
      toast.error(e instanceof ApiClientError ? e.message : "Could not record the report");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {kind === "damaged" ? <AlertOctagon className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            Report {kind === "damaged" ? "Damaged" : "Obsolete"} Stock
          </DialogTitle>
          <DialogDescription>
            The goods stay on the books until the disposal is approved and carried out.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Item *</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger><SelectValue placeholder="Select the item" /></SelectTrigger>
              <SelectContent>
                {inventory.data?.items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.code} — {i.name} ({formatNumber(i.totalQuantity)} {i.uom.code} on hand)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Store *</Label>
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger><SelectValue placeholder="Holding store" /></SelectTrigger>
                <SelectContent>
                  {stores.data?.items.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Quantity *</Label>
              <Input
                type="number" step="any" min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Reason *</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={kind === "damaged" ? "e.g. Water damage in storage" : "e.g. Superseded model, no longer supported"}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={report.isPending}>
            {report.isPending ? "Recording..." : "Record Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DisposeDialog({
  kind, row, onClose,
}: { kind: DispositionKind; row: Disposition | null; onClose: () => void }) {
  const dispose = useDisposeDisposition(kind);
  const [method, setMethod] = useState("");

  const onSubmit = async () => {
    if (!row) return;
    if (method.trim().length < 2) return toast.error("Record how the goods were disposed of");
    try {
      await dispose.mutateAsync({ id: row.id, disposalMethod: method.trim() });
      toast.success(`${formatNumber(row.quantity)} × ${row.item.code} written off and removed from stock`);
      setMethod("");
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Could not dispose");
    }
  };

  return (
    <Dialog open={!!row} onOpenChange={(v) => { if (!v) { onClose(); setMethod(""); } }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-danger">
            <Trash2 className="h-4 w-4" /> Dispose of these goods?
          </DialogTitle>
          <DialogDescription>
            {row ? `${formatNumber(row.quantity)} × ${row.item.code} — ${row.item.name}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded border border-danger/40 bg-danger-subtle px-3 py-2 text-xs">
          <AlertOctagon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger-strong" />
          <p>
            This is the step that removes the stock. The oldest FIFO layers are consumed, the
            loss is recorded at the cost the units were carried at, and the store balance drops
            by {row ? formatNumber(row.quantity) : ""}. It cannot be undone.
          </p>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold">Disposal method *</Label>
          <Input
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="e.g. Scrapped, Sold as scrap, Returned to supplier"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={onSubmit}
            disabled={dispose.isPending}
            className="bg-danger hover:bg-danger-strong text-danger-foreground"
          >
            {dispose.isPending ? "Disposing..." : "Dispose & Write Off"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
