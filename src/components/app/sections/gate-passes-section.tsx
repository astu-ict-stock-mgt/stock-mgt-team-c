"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck, Plus, Search, CheckCircle2, XCircle, LogOut, Truck, Ban,
} from "lucide-react";
import {
  useGatePasses, useRequestGatePass, useDecideGatePass,
  useConfirmGatePassExit, useCancelGatePass,
  useIssues, usePermissions,
} from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import type { GatePass } from "@/lib/types";
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
import { useUIStore } from "@/stores/ui-store";
import { formatNumber, statusColor, formatDate } from "@/lib/utils/format";
import { toast } from "sonner";

/**
 * Gate passes — authorisation for materials to leave the campus, and the Security
 * Officer's only job in the system.
 *
 * request → approve/reject → confirm exit. No stock moves here; the stock issue
 * already did that. This is the control document that says the movement off site
 * was authorised and actually happened.
 */

export function GatePassesSection() {
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [deciding, setDeciding] = useState<{ pass: GatePass; decision: "APPROVED" | "REJECTED" } | null>(null);
  const [cancelling, setCancelling] = useState<GatePass | null>(null);

  const { can, userId } = usePermissions();
  const canRequest = can("gatepass.request");
  const canApprove = can("gatepass.approve");

  const notificationTarget = useUIStore((s) => s.notificationTarget);
  const setNotificationTarget = useUIStore((s) => s.setNotificationTarget);

  // The bell links here with filter "pending" when passes await approval.
  useEffect(() => {
    if (notificationTarget === "pending") {
      setStatus("PENDING");
      setPage(1);
      setNotificationTarget(null);
    }
  }, [notificationTarget, setNotificationTarget]);

  const { data, isLoading, isError, refetch } = useGatePasses({
    page, limit, search: search || undefined, status: status || undefined,
  });

  const confirmExit = useConfirmGatePassExit();
  const cancel = useCancelGatePass();

  const onConfirmExit = async (pass: GatePass) => {
    try {
      await confirmExit.mutateAsync(pass.id);
      toast.success(`Exit confirmed for ${pass.code}`);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Could not confirm the exit");
    }
  };

  const onCancel = async () => {
    if (!cancelling) return;
    try {
      await cancel.mutateAsync(cancelling.id);
      toast.success(`${cancelling.code} cancelled`);
      setCancelling(null);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Could not cancel the gate pass");
    }
  };

  return (
    <div>
      <PageHeader
        title="Gate Passes"
        description="Authorise materials leaving the campus and record the confirmed exit"
        icon={ShieldCheck}
        action={canRequest ? (
          <Button size="sm" onClick={() => setRequestOpen(true)}>
            <Plus className="h-4 w-4" /> Request Pass
          </Button>
        ) : undefined}
      />

      <Card className="mb-4 p-3 border border-border shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 h-9"
              placeholder="Search by pass code, issue, carrier or plate..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={status || "ALL"} onValueChange={(v) => { setStatus(v === "ALL" ? "" : v); setPage(1); }}>
            <SelectTrigger className="h-9 w-full sm:w-48 text-xs">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending approval</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="EXIT_CONFIRMED">Exit confirmed</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? <SectionLoading variant="table" /> :
       isError ? <SectionError message="Failed to load gate passes" onRetry={() => refetch()} /> :
       !data || data.items.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={search || status ? "No gate passes match" : "No gate passes yet"}
          description="A gate pass authorises goods to leave the campus. A storekeeper raises it against a stock issue, security approves it, and security confirms the exit at the gate."
          actionLabel={canRequest ? "Request Pass" : undefined}
          onAction={canRequest ? () => setRequestOpen(true) : undefined}
        />
       ) : (
        <ResponsiveTable
          footerAction={canRequest ? <AstuAction onClick={() => setRequestOpen(true)}>+ Request</AstuAction> : undefined}
          mobileCards={data.items.map((p) => (
            <MobileCard
              key={p.id}
              primary={p.code}
              secondary={p.issue ? `Issue ${p.issue.code} · ${p.issue.department}` : "No linked issue"}
              badge={<StatusPill status={p.status} />}
              meta={[
                { label: "Carrier", value: p.carrier ?? "—" },
                { label: "Vehicle", value: p.vehiclePlate ?? "—" },
                { label: "Requested By", value: p.requestedBy.fullName },
                { label: "Raised", value: formatDate(p.createdAt) },
              ]}
              action={
                <PassActions
                  pass={p} userId={userId} canApprove={canApprove}
                  onDecide={(decision) => setDeciding({ pass: p, decision })}
                  onConfirmExit={() => onConfirmExit(p)}
                  onCancel={() => setCancelling(p)}
                  pending={confirmExit.isPending}
                />
              }
            />
          ))}
        >
          <table className="astu-table">
            <thead>
              <tr>
                <th>Pass</th>
                <th>Stock Issue</th>
                <th>Carrier / Vehicle</th>
                <th>Requested By</th>
                <th>Security</th>
                <th>Raised</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{p.code}</td>
                  <td className="text-xs">
                    {p.issue ? (
                      <>
                        <span className="font-mono">{p.issue.code}</span>
                        <span className="block text-[10px] text-muted-foreground">
                          {p.issue.department} · {formatNumber(p.issue.totalQuantity)} unit(s) from {p.issue.sourceStore.code}
                        </span>
                      </>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="text-xs">
                    {p.carrier ?? "—"}
                    {p.vehiclePlate ? (
                      <span className="block font-mono text-[10px] text-muted-foreground">{p.vehiclePlate}</span>
                    ) : null}
                  </td>
                  <td className="text-xs">{p.requestedBy.fullName}</td>
                  <td className="text-xs">
                    {p.securityOfficer?.fullName ?? <span className="text-muted-foreground">—</span>}
                    {p.exitConfirmedAt ? (
                      <span className="block text-[10px] text-muted-foreground">
                        exited {formatDate(p.exitConfirmedAt, true)}
                      </span>
                    ) : null}
                  </td>
                  <td className="text-xs">{formatDate(p.createdAt)}</td>
                  <td><Badge variant={statusColor(p.status)} className="text-[10px]">{p.status.replace(/_/g, " ")}</Badge></td>
                  <td>
                    <PassActions
                      pass={p} userId={userId} canApprove={canApprove}
                      onDecide={(decision) => setDeciding({ pass: p, decision })}
                      onConfirmExit={() => onConfirmExit(p)}
                      onCancel={() => setCancelling(p)}
                      pending={confirmExit.isPending}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPage={setPage} />
        </ResponsiveTable>
      )}

      <RequestGatePassDialog open={requestOpen} onOpenChange={setRequestOpen} />
      <DecisionDialog target={deciding} onClose={() => setDeciding(null)} />

      <Dialog open={!!cancelling} onOpenChange={(v) => !v && setCancelling(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-4 w-4" /> Cancel {cancelling?.code}?
            </DialogTitle>
            <DialogDescription>The pass can no longer be used at the gate.</DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Cancelling does not touch stock — the issue behind this pass stays as it is.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelling(null)}>Keep</Button>
            <Button onClick={onCancel} disabled={cancel.isPending}>
              {cancel.isPending ? "Cancelling..." : "Cancel Pass"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PassActions({
  pass, userId, canApprove, onDecide, onConfirmExit, onCancel, pending,
}: {
  pass: GatePass;
  userId: string | null;
  canApprove: boolean;
  onDecide: (decision: "APPROVED" | "REJECTED") => void;
  onConfirmExit: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const isOwn = pass.requestedBy.id === userId;
  // The server refuses a requester approving their own pass, so the buttons are
  // not offered rather than offered and rejected.
  const mayDecide = canApprove && !isOwn;

  if (pass.status === "PENDING") {
    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        {mayDecide ? (
          <>
            <AstuAction variant="primary" onClick={() => onDecide("APPROVED")}>
              <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Approve</span>
            </AstuAction>
            <AstuAction variant="danger" onClick={() => onDecide("REJECTED")}>
              <span className="inline-flex items-center gap-1"><XCircle className="h-3 w-3" />Reject</span>
            </AstuAction>
          </>
        ) : (
          <span
            className="text-[10px] text-muted-foreground"
            title={isOwn ? "You requested this pass — security must approve it" : "Awaiting security approval"}
          >
            {isOwn ? "awaiting security" : "pending"}
          </span>
        )}
        {isOwn ? <AstuAction onClick={onCancel}>Cancel</AstuAction> : null}
      </span>
    );
  }

  if (pass.status === "APPROVED") {
    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        {canApprove ? (
          <AstuAction variant="primary" onClick={pending ? undefined : onConfirmExit}>
            <span className="inline-flex items-center gap-1"><LogOut className="h-3 w-3" />Confirm Exit</span>
          </AstuAction>
        ) : (
          <span className="text-[10px] text-muted-foreground">cleared for exit</span>
        )}
        {isOwn || canApprove ? <AstuAction onClick={onCancel}>Cancel</AstuAction> : null}
      </span>
    );
  }

  if (pass.status === "EXIT_CONFIRMED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ShieldCheck className="h-3 w-3" /> exited
      </span>
    );
  }

  return <span className="text-xs text-muted-foreground">—</span>;
}

function RequestGatePassDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  // Only completed issues can leave the campus, and each issue may carry at most
  // one pass, so the list is narrowed to issues that do not have one yet.
  const issues = useIssues({ page: 1, limit: 100, status: "COMPLETED" });
  const request = useRequestGatePass();

  const [issueId, setIssueId] = useState("");
  const [carrier, setCarrier] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [notes, setNotes] = useState("");

  const reset = () => { setIssueId(""); setCarrier(""); setVehiclePlate(""); setNotes(""); };

  const onSubmit = async () => {
    if (!carrier.trim()) return toast.error("Name the person or company carrying the goods");
    try {
      const pass = await request.mutateAsync({
        issueId: issueId || null,
        carrier: carrier.trim(),
        vehiclePlate: vehiclePlate.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success(`${pass.code} requested — awaiting security approval`);
      onOpenChange(false);
      reset();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Could not request the gate pass");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-4 w-4" /> Request Gate Pass
          </DialogTitle>
          <DialogDescription>
            Security reviews the request, then confirms the exit at the gate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Stock Issue</Label>
            <Select value={issueId || "NONE"} onValueChange={(v) => setIssueId(v === "NONE" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Link a stock issue (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">No linked issue</SelectItem>
                {issues.data?.items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.code} — {i.department} ({formatNumber(i.totalQuantity)} unit(s))
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              An issue can carry only one gate pass. Leave this empty for goods leaving
              without a stock issue behind them.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Carrier *</Label>
              <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Person or company" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Vehicle Plate</Label>
              <Input
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                placeholder="e.g. 3-A12345 AA"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Purpose, destination, expected return" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={request.isPending}>
            {request.isPending ? "Requesting..." : "Request Pass"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DecisionDialog({
  target, onClose,
}: {
  target: { pass: GatePass; decision: "APPROVED" | "REJECTED" } | null;
  onClose: () => void;
}) {
  const decide = useDecideGatePass();
  const [notes, setNotes] = useState("");

  const approving = target?.decision === "APPROVED";

  const onSubmit = async () => {
    if (!target) return;
    if (!approving && notes.trim().length < 3) {
      return toast.error("Give a reason for rejecting the pass");
    }
    try {
      await decide.mutateAsync({
        id: target.pass.id,
        decision: target.decision,
        notes: notes.trim() || undefined,
      });
      toast.success(`${target.pass.code} ${approving ? "approved" : "rejected"}`);
      setNotes("");
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Could not record the decision");
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(v) => { if (!v) { onClose(); setNotes(""); } }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${approving ? "" : "text-danger"}`}>
            {approving ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {approving ? "Approve" : "Reject"} {target?.pass.code}
          </DialogTitle>
          <DialogDescription>
            {target?.pass.issue
              ? `Issue ${target.pass.issue.code} · ${formatNumber(target.pass.issue.totalQuantity)} unit(s) · ${target.pass.issue.department}`
              : "No linked stock issue"}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-[10px] uppercase text-muted-foreground">Requested By</dt>
            <dd className="font-medium">{target?.pass.requestedBy.fullName}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-muted-foreground">Carrier</dt>
            <dd className="font-medium">{target?.pass.carrier ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-muted-foreground">Vehicle</dt>
            <dd className="font-mono font-medium">{target?.pass.vehiclePlate ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-muted-foreground">Raised</dt>
            <dd className="font-medium">{target ? formatDate(target.pass.createdAt, true) : ""}</dd>
          </div>
        </dl>

        {target?.pass.notes ? (
          <p className="rounded border border-border bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
            {target.pass.notes}
          </p>
        ) : null}

        <div className="space-y-1">
          <Label className="text-xs font-semibold">
            {approving ? "Remarks" : "Reason for rejection *"}
          </Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={approving ? "Optional" : "Why is this pass refused?"}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={onSubmit}
            disabled={decide.isPending}
            className={approving ? "" : "bg-danger hover:bg-danger-strong text-danger-foreground"}
          >
            {decide.isPending ? "Saving..." : approving ? "Approve Pass" : "Reject Pass"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
