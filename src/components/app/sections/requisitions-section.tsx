"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, FileText, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AstuAction,
  AstuCardTable,
  PageHeader,
  Pagination,
  SectionEmpty,
  SectionError,
  SectionLoading,
  StatCard,
} from "@/components/app/section-utils";
import { useCreateRequisition, useDecisionRequisition, useInventory, useMe, useRequisitions, useSubmitRequisition } from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import { formatDate, statusColor } from "@/lib/utils/format";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { useUIStore } from "@/stores/ui-store";

const RequisitionFormSchema = z.object({
  department: z.string().min(1, "Department is required"),
  requiredDate: z.string().min(1, "Required date is required"),
  notes: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string().min(1, "Item is required"),
    quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  })).min(1, "Add at least one item"),
});

type RequisitionFormValues = z.infer<typeof RequisitionFormSchema>;

const DEPARTMENT_OPTIONS = [
  "Administration",
  "Finance",
  "Human Resources",
  "IT",
  "Maintenance",
  "Procurement",
  "Security",
  "Stores",
  "Teaching",
];

export function RequisitionsSection() {
  const me = useMe();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const notificationTarget = useUIStore((s) => s.notificationTarget);
  const setNotificationTarget = useUIStore((s) => s.setNotificationTarget);

  const inventory = useInventory({ page: 1, limit: 200 });
  const { data, isLoading, isError, refetch } = useRequisitions({
    page,
    limit,
    search: search || undefined,
    status: status || undefined,
  });
  const createRequisition = useCreateRequisition();
  const submitRequisition = useSubmitRequisition();
  const decideRequisition = useDecisionRequisition();
  const canCreateRequisition = me.data?.roles?.some((role) => ["ADMINISTRATOR", "DEPARTMENT_HEAD"].includes(role)) ?? false;

  const form = useForm<RequisitionFormValues>({
    resolver: zodResolver(RequisitionFormSchema),
    defaultValues: {
      department: me.data?.user.department ?? "",
      requiredDate: new Date().toISOString().slice(0, 10),
      notes: "",
      items: [{ itemId: "", quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    if (me.data?.user.department && !form.getValues("department")) {
      form.setValue("department", me.data.user.department);
    }
  }, [form, me.data?.user.department]);

  const onSubmit = async (values: RequisitionFormValues) => {
    try {
      await createRequisition.mutateAsync({
        department: values.department,
        requiredDate: values.requiredDate,
        notes: values.notes || undefined,
        items: values.items,
      });
      toast.success("Requisition created successfully");
      form.reset({
        department: me.data?.user.department ?? "",
        requiredDate: new Date().toISOString().slice(0, 10),
        notes: "",
        items: [{ itemId: "", quantity: 1 }],
      });
      refetch();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to create requisition");
    }
  };

  const summary = useMemo(() => {
    const items = data?.items ?? [];
    return {
      total: data?.total ?? 0,
      draft: items.filter((item) => item.status === "DRAFT").length,
      awaiting: items.filter((item) => ["SUBMITTED", "PENDING_APPROVAL"].includes(item.status)).length,
      approved: items.filter((item) => ["APPROVED", "FULFILLED", "PARTIALLY_FULFILLED"].includes(item.status)).length,
    };
  }, [data]);

  const canSubmit = (requisition: any) => me.data?.user.id === requisition.requestedBy.id || me.data?.roles?.includes("ADMINISTRATOR");
  const canApprove = me.data?.permissions?.includes("requisition.approve") || false;

  useEffect(() => {
    if (notificationTarget !== "pending") return;
    setStatus("PENDING");
    setPage(1);
    setNotificationTarget(null);
  }, [notificationTarget, setNotificationTarget]);

  return (
    <div>
      <PageHeader
        title="Requisitions"
        description="Department stock requests with multi-level approval workflow"
        icon={FileText}
      />

      {canCreateRequisition ? (
        <Card className="mb-4 border border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-semibold">Department creates requisition</h3>
                <p className="text-xs text-muted-foreground">Use this form to request stock from your department before approval.</p>
              </div>
              <Badge variant="outline" className="text-[10px]">Draft request</Badge>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Department *</Label>
                  <Input {...form.register("department")} list="requisition-departments" placeholder="e.g. IT, Finance, Stores" />
                  <datalist id="requisition-departments">
                    {DEPARTMENT_OPTIONS.map((department) => (
                      <option key={department} value={department} />
                    ))}
                    {me.data?.user.department && !DEPARTMENT_OPTIONS.includes(me.data.user.department) ? (
                      <option value={me.data.user.department} />
                    ) : null}
                  </datalist>
                  <p className="text-[10px] text-muted-foreground">Visible by default. Start typing or choose your department from the suggestions.</p>
                  {form.formState.errors.department && <p className="text-xs text-destructive">{form.formState.errors.department.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Required Date *</Label>
                  <Input type="date" {...form.register("requiredDate")} />
                  {form.formState.errors.requiredDate && <p className="text-xs text-destructive">{form.formState.errors.requiredDate.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Notes</Label>
                  <Input {...form.register("notes")} placeholder="Optional note" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Requested Items *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ itemId: "", quantity: 1 })}>
                    <Plus className="h-4 w-4 mr-1" /> Add Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid gap-2 md:grid-cols-[1fr_140px_auto] items-start rounded-md border border-border p-3 bg-surface-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Item</Label>
                        <Select value={form.watch(`items.${index}.itemId`)} onValueChange={(value) => form.setValue(`items.${index}.itemId`, value, { shouldValidate: true })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            {(inventory.data?.items ?? []).map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.code} - {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.items?.[index]?.itemId && (
                          <p className="text-xs text-destructive">{form.formState.errors.items[index]?.itemId?.message}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Quantity</Label>
                        <Input type="number" step="1" min="1" {...form.register(`items.${index}.quantity` as const, { valueAsNumber: true })} />
                        {form.formState.errors.items?.[index]?.quantity && (
                          <p className="text-xs text-destructive">{form.formState.errors.items[index]?.quantity?.message}</p>
                        )}
                      </div>

                      <div className="pt-6">
                        <Button type="button" variant="ghost" size="icon" onClick={() => fields.length > 1 && remove(index)} disabled={fields.length === 1}>
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {form.formState.errors.items && typeof form.formState.errors.items?.message === "string" && (
                  <p className="text-xs text-destructive">{form.formState.errors.items.message}</p>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit" className="bg-primary hover:bg-primary-strong text-primary-foreground" disabled={createRequisition.isPending}>
                  {createRequisition.isPending ? "Submitting..." : "Create Requisition"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-4 border border-dashed border-border bg-surface-2 shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-base font-semibold">Requisition creation is restricted</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Department Heads and Administrators create requisitions. PAO users review and approve them from the list below.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-4">
        <StatCard label="Total" value={summary.total} icon={FileText} tone="primary" />
        <StatCard label="Draft" value={summary.draft} icon={Clock} tone="neutral" />
        <StatCard label="Awaiting Approval" value={summary.awaiting} icon={AlertCircle} tone="warning" />
        <StatCard label="Approved / Fulfilled" value={summary.approved} icon={CheckCircle2} tone="success" />
      </div>

      <Card className="mb-4 border border-border p-3 shadow-sm">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-8"
              placeholder="Search by requisition code or department..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={status || "ALL"}
            onValueChange={(value) => {
              setStatus(value === "ALL" ? "" : value);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SUBMITTED">Submitted</SelectItem>
              <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="PARTIALLY_FULFILLED">Partially Fulfilled</SelectItem>
              <SelectItem value="FULFILLED">Fulfilled</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <SectionLoading label="Loading requisitions..." />
      ) : isError ? (
        <SectionError message="Failed to load requisitions" onRetry={() => refetch()} />
      ) : !data || data.items.length === 0 ? (
        <SectionEmpty title="No requisitions found" message="Create requisitions in the backend to see them here." />
      ) : (
        <AstuCardTable title="Requisition Records" footerAction={<AstuAction onClick={() => refetch()}>Refresh</AstuAction>}>
          <table className="astu-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Requested By</th>
                <th>Department</th>
                <th>Items</th>
                <th>Status</th>
                <th>Required Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((requisition) => (
                <tr key={requisition.id}>
                  <td>
                    <p className="text-sm font-medium">{requisition.code}</p>
                    <p className="text-xs text-muted-foreground">{requisition.notes ?? "No notes"}</p>
                  </td>
                  <td>
                    <p className="text-sm font-medium">{requisition.requestedBy.fullName}</p>
                    <p className="text-xs text-muted-foreground">{requisition.requestedBy.email}</p>
                  </td>
                  <td className="text-xs">{requisition.department}</td>
                  <td>
                    <div className="text-xs">
                      <p>
                        {requisition.itemCount} line item{requisition.itemCount === 1 ? "" : "s"}
                      </p>
                      <p className="text-muted-foreground">{requisition.items.reduce((sum, item) => sum + item.quantity, 0)} total qty</p>
                    </div>
                  </td>
                  <td>
                    <Badge variant={statusColor(requisition.status)} className="text-[10px]">
                      {requisition.status}
                    </Badge>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {requisition.approvalCount}/2 approvals
                    </p>
                    {requisition.latestApproval ? (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Last: {requisition.latestApproval.status} by {requisition.latestApproval.approver.fullName}
                      </p>
                    ) : null}
                  </td>
                  <td className="text-xs">{formatDate(requisition.requiredDate)}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      {requisition.status === "DRAFT" && canSubmit(requisition) ? (
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 bg-info hover:bg-info-strong text-info-foreground"
                          disabled={submitRequisition.isPending}
                          onClick={async () => {
                            try {
                              await submitRequisition.mutateAsync(requisition.id);
                              toast.success("Requisition submitted");
                            } catch (error) {
                              toast.error(error instanceof ApiClientError ? error.message : "Failed to submit requisition");
                            }
                          }}
                        >
                          Submit
                        </Button>
                      ) : null}
                      {canApprove && ["SUBMITTED", "PENDING_APPROVAL"].includes(requisition.status) ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 bg-success hover:bg-success-strong text-success-foreground"
                            disabled={decideRequisition.isPending}
                            onClick={async () => {
                              try {
                                await decideRequisition.mutateAsync({ id: requisition.id, decision: "APPROVED" });
                                toast.success("Requisition approved");
                              } catch (error) {
                                toast.error(error instanceof ApiClientError ? error.message : "Failed to approve requisition");
                              }
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 border-danger text-danger hover:bg-danger hover:text-danger-foreground"
                            disabled={decideRequisition.isPending}
                            onClick={async () => {
                              try {
                                await decideRequisition.mutateAsync({ id: requisition.id, decision: "REJECTED" });
                                toast.success("Requisition rejected");
                              } catch (error) {
                                toast.error(error instanceof ApiClientError ? error.message : "Failed to reject requisition");
                              }
                            }}
                          >
                            Reject
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPage={setPage} />
        </AstuCardTable>
      )}

      <Card className="mt-4 border border-border shadow-sm">
        <CardContent className="p-4">
          <h4 className="mb-2 text-sm font-semibold text-primary">Requisition Statuses (per SRS)</h4>
          <div className="flex flex-wrap gap-2">
            {[
              "DRAFT",
              "SUBMITTED",
              "PENDING_APPROVAL",
              "APPROVED",
              "REJECTED",
              "PARTIALLY_FULFILLED",
              "FULFILLED",
              "CANCELLED",
            ].map((item) => (
              <Badge key={item} variant="outline" className="text-[10px]">
                {item}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}