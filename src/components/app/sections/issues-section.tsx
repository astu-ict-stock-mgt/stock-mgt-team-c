"use client";

import { useEffect, useState } from "react";
import { Plus, Search, ArrowUpFromLine, X, Eye } from "lucide-react";
import { useIssues, useCreateIssue, useWarehouses, useInventory, useIssue } from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, SectionError, SectionLoading, SectionEmpty, Pagination, AstuAction, AstuCardTable } from "@/components/app/section-utils";
import { useUIStore } from "@/stores/ui-store";
import { formatCurrency, formatNumber, statusColor, formatDate } from "@/lib/utils/format";
import { toast } from "sonner";

type LineItem = { itemId: string; quantity: number; remarks?: string };

export function IssuesSection() {
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useIssues({ page, limit, search: search || undefined });
  const setSelectedItemId = useUIStore((s) => s.setSelectedItemId);
  const issueDraftRequisition = useUIStore((s) => s.issueDraftRequisition);
  const setIssueDraftRequisition = useUIStore((s) => s.setIssueDraftRequisition);

  useEffect(() => {
    if (issueDraftRequisition) {
      setCreateOpen(true);
    }
  }, [issueDraftRequisition]);

  return (
    <div>
      <PageHeader
        title="Stock Issues"
        description="Stock issued to departments — FIFO consumption + COGS computed automatically"
        icon={ArrowUpFromLine}
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Issue
          </Button>
        }
      />

      <Card className="mb-4 p-3 border border-border shadow-sm">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Search by issue code..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </Card>

      {isLoading ? <SectionLoading /> :
       isError ? <SectionError message="Failed to load issues" onRetry={() => refetch()} /> :
       !data || data.items.length === 0 ? <SectionEmpty title="No issues yet" message="Issue stock to departments to consume FIFO layers" /> : (
        <AstuCardTable footerAction={<AstuAction onClick={() => setCreateOpen(true)}>+ New</AstuAction>}>
          <table className="astu-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Warehouse</th>
                <th>Department</th>
                <th className="text-right">Qty</th>
                <th className="text-right">COGS</th>
                <th>Items</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((i) => (
                <tr key={i.id}>
                  <td className="font-mono text-xs">{i.code}</td>
                  <td className="text-xs">{i.sourceWarehouse.name}</td>
                  <td className="text-xs">{i.department}</td>
                  <td className="text-right font-semibold">{formatNumber(i.totalQuantity)}</td>
                  <td className="text-right text-danger font-semibold">{formatCurrency(i.totalCogs)}</td>
                  <td className="text-xs">{i.itemCount}</td>
                  <td className="text-xs">{formatDate(i.issueDate)}</td>
                  <td><Badge variant={statusColor(i.status)} className="text-[10px]">{i.status}</Badge></td>
                  <td>
                    <AstuAction onClick={() => setSelectedItemId(i.id)}>
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

      <IssueDetailDrawer />
      <CreateIssueDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setIssueDraftRequisition(null);
        }}
      />
    </div>
  );
}

function CreateIssueDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const warehouses = useWarehouses();
  const inventory = useInventory({ page: 1, limit: 100 });
  const create = useCreateIssue();
  const issueDraftRequisition = useUIStore((s) => s.issueDraftRequisition);
  const setIssueDraftRequisition = useUIStore((s) => s.setIssueDraftRequisition);

  const [sourceWarehouseId, setSourceWarehouseId] = useState("");
  const [department, setDepartment] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);

  useEffect(() => {
    if (!issueDraftRequisition) return;
    setDepartment(issueDraftRequisition.department);
    setNotes(issueDraftRequisition.notes ?? "");
    setItems(issueDraftRequisition.items.map((item) => ({ itemId: item.itemId, quantity: item.quantity })));
  }, [issueDraftRequisition]);

  const addItem = () => setItems((arr) => [...arr, { itemId: "", quantity: 1 }]);
  const removeItem = (idx: number) => setItems((arr) => arr.filter((_, i) => i !== idx));
  const updateItem = (idx: number, patch: Partial<LineItem>) => setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0);

  const onSubmit = async () => {
    if (!sourceWarehouseId) return toast.error("Select source warehouse");
    if (!department.trim()) return toast.error("Department is required");
    if (items.length === 0) return toast.error("Add at least one item");
    if (items.some((i) => !i.itemId || i.quantity <= 0)) return toast.error("Check item details");
    try {
      const result = await create.mutateAsync({
        sourceWarehouseId,
        department,
        requisitionId: issueDraftRequisition?.id,
        notes: notes || undefined,
        items,
      });
      toast.success(`Stock issued — COGS: ${formatCurrency(result.totalCogs)}`);
      onOpenChange(false);
      setSourceWarehouseId(""); setDepartment(""); setNotes(""); setItems([]);
      setIssueDraftRequisition(null);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-danger flex items-center gap-2">
            <ArrowUpFromLine className="h-4 w-4" /> Issue Stock
          </DialogTitle>
          <DialogDescription>Consumes FIFO layers (oldest first), updates warehouse stock, computes COGS</DialogDescription>
        </DialogHeader>
        {issueDraftRequisition ? (
          <div className="rounded border border-primary/30 bg-accent px-3 py-2 text-xs text-primary-strong">
            Prefilled from requisition {issueDraftRequisition.code} for {issueDraftRequisition.department}
          </div>
        ) : null}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Source Warehouse *</Label>
              <Select value={sourceWarehouseId} onValueChange={setSourceWarehouseId}>
                <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                <SelectContent>
                  {warehouses.data?.items.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Department *</Label>
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. IT, Finance" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-danger">Items</Label>
              <Button type="button" variant="outline" size="sm" className="h-7" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Add Item</Button>
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
                          <SelectItem key={i.id} value={i.id}>{i.code} — {i.name} ({formatNumber(i.totalQuantity)} {i.uom.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4 space-y-1">
                    <Label className="text-[10px]">Quantity</Label>
                    <Input type="number" step="any" className="h-8" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(idx)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            {items.length > 0 && (
              <div className="mt-2 text-sm font-semibold px-1">Total Quantity: <span className="text-danger tabular">{formatNumber(totalQty)}</span></div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={create.isPending} className="bg-danger hover:bg-danger-strong text-danger-foreground">
            {create.isPending ? "Issuing..." : "Issue Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IssueDetailDrawer() {
  const selectedItemId = useUIStore((s) => s.selectedItemId);
  const setSelectedItemId = useUIStore((s) => s.setSelectedItemId);
  const { data: issue, isLoading } = useIssue(selectedItemId);

  return (
    <Dialog open={!!selectedItemId} onOpenChange={(open) => !open && setSelectedItemId(null)}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        {isLoading ? <SectionLoading /> : issue ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-mono text-base text-danger">{issue.code}</DialogTitle>
              <DialogDescription>
                Issued {formatDate(issue.issueDate, true)} · {issue.sourceWarehouse.name} → {issue.department}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded border border-border bg-surface-2 px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Total Quantity</p>
                <p className="text-sm font-semibold tabular">{formatNumber(issue.totalQuantity)}</p>
              </div>
              <div className="rounded border border-border bg-surface-2 px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Total COGS</p>
                <p className="text-sm font-semibold text-danger tabular">{formatCurrency(issue.totalCogs)}</p>
              </div>
              <div className="rounded border border-border bg-surface-2 px-3 py-2">
                <p className="text-[10px] text-muted-foreground uppercase">Status</p>
                <Badge variant={statusColor(issue.status)} className="text-[10px]">{issue.status}</Badge>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-danger mb-2 uppercase tracking-wider">Issued Items</h4>
              <AstuCardTable>
                <table className="astu-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Unit Cost</th>
                      <th className="text-right">COGS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issue.items.map((it) => (
                      <tr key={it.id}>
                        <td>
                          <p className="text-sm font-medium">{it.itemName}</p>
                          <p className="text-xs text-muted-foreground">{it.itemCode} · {it.uom}</p>
                        </td>
                        <td className="text-right">{formatNumber(it.quantity)}</td>
                        <td className="text-right">{formatCurrency(it.unitCost)}</td>
                        <td className="text-right font-semibold text-danger">{formatCurrency(it.cogs)}</td>
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
