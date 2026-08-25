"use client";

import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Truck, Pencil, CheckCircle2, XCircle } from "lucide-react";
import { useSuppliers, useCreateSupplier, useUpdateSupplier } from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader, SectionError, SectionLoading, EmptyState, AstuAction, MobileCard, StatusPill } from "@/components/app/section-utils";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Supplier } from "@/lib/types";

const Schema = z.object({
  name: z.string().min(2),
  contactPerson: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "BLACKLISTED"]).default("ACTIVE"),
});
type Form = z.infer<typeof Schema>;

export function SuppliersSection() {
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(25);
  const [search, setSearch]       = useState("");
  const [status, setStatus]       = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing]     = useState<Supplier | null>(null);

  const { data, isLoading, isError, refetch } = useSuppliers({
    page,
    limit: pageSize,
    search: search || undefined,
    status: status || undefined,
  });
  const create = useCreateSupplier();
  const update = useUpdateSupplier();

  const form = useForm<Form>({
    resolver: zodResolver(Schema),
    defaultValues: { name: "", contactPerson: "", email: "", phone: "", address: "", status: "ACTIVE" },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", contactPerson: "", email: "", phone: "", address: "", status: "ACTIVE" });
    setCreateOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    form.reset({
      name: s.name,
      contactPerson: s.contactPerson ?? "",
      email: s.email ?? "",
      phone: s.phone ?? "",
      address: s.address ?? "",
      status: s.status as "ACTIVE" | "INACTIVE" | "BLACKLISTED",
    });
    setCreateOpen(true);
  };

  const onSubmit = async (values: Form) => {
    const payload = { ...values, email: values.email || null };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...payload });
        toast.success("Supplier updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Supplier created");
      }
      setCreateOpen(false);
      form.reset();
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed");
    }
  };

  /* ── Bulk status update helper ──────────────────────────────────── */
  const bulkSetStatus = async (
    rows: Supplier[],
    newStatus: "ACTIVE" | "INACTIVE",
    clearSelection: () => void
  ) => {
    const toChange = rows.filter((r) => r.status !== newStatus);
    if (toChange.length === 0) {
      toast.info(`All selected suppliers are already ${newStatus.toLowerCase()}`);
      return;
    }
    try {
      await Promise.all(toChange.map((r) => update.mutateAsync({ id: r.id, status: newStatus })));
      toast.success(
        `${toChange.length} supplier${toChange.length !== 1 ? "s" : ""} set to ${newStatus.toLowerCase()}`
      );
      clearSelection();
      refetch();
    } catch {
      toast.error("Some updates failed — please try again");
    }
  };

  /* ── Column definitions ─────────────────────────────────────────── */
  const columns = useMemo<ColumnDef<Supplier, unknown>[]>(() => [
    {
      id: "code",
      accessorKey: "code",
      header: "Code",
      meta: { label: "Code" },
      cell: ({ getValue }) => (
        <span className="font-mono text-xs">{getValue() as string}</span>
      ),
      size: 110,
    },
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
      meta: { label: "Name" },
      cell: ({ getValue }) => (
        <span className="font-medium text-sm">{getValue() as string}</span>
      ),
    },
    {
      id: "contactPerson",
      accessorKey: "contactPerson",
      header: "Contact",
      meta: { label: "Contact Person" },
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="text-xs">{(getValue() as string | null) ?? "—"}</span>
      ),
    },
    {
      id: "phone",
      accessorKey: "phone",
      header: "Phone",
      meta: { label: "Phone" },
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="text-xs">{(getValue() as string | null) ?? "—"}</span>
      ),
      size: 130,
    },
    {
      id: "receiptCount",
      accessorKey: "receiptCount",
      header: "Receipts",
      meta: { label: "Receipts" },
      cell: ({ getValue }) => (
        <span className="tabular text-xs">{getValue() as number}</span>
      ),
      size: 80,
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      meta: { label: "Status" },
      enableSorting: false,
      cell: ({ getValue }) => <StatusPill status={getValue() as string} />,
      size: 120,
    },
    {
      id: "actions",
      header: "",
      meta: { label: "Actions" },
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <AstuAction onClick={() => openEdit(row.original)}>
          <Pencil className="h-3 w-3" /> Edit
        </AstuAction>
      ),
      size: 70,
    },
  ], []);

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Manage suppliers and contact information"
        icon={Truck}
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Supplier
          </Button>
        }
      />

      {/* Status filter — DataTable owns the text search */}
      <div className="mb-3 flex flex-wrap gap-2">
        <Select
          value={status || "ALL"}
          onValueChange={(v) => { setStatus(v === "ALL" ? "" : v); setPage(1); }}
        >
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="BLACKLISTED">Blacklisted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <SectionLoading variant="table" /> :
       isError ? <SectionError message="Failed to load suppliers" onRetry={() => refetch()} /> :
       !data ? null : data.total === 0 && !search && !status ? (
        <EmptyState
          icon={Truck}
          title="No suppliers yet"
          description="Register your first supplier to start tracking goods received and supplier performance."
          actionLabel="New Supplier"
          onAction={openCreate}
        />
       ) : (
        <>
          {/* ── Mobile card list (< sm) ── */}
          <div className="sm:hidden astu-card overflow-hidden">
            {data.items.map((s) => (
              <MobileCard
                key={s.id}
                primary={s.name}
                secondary={s.code}
                badge={<StatusPill status={s.status} />}
                meta={[
                  { label: "Contact",  value: s.contactPerson ?? "—" },
                  { label: "Phone",    value: s.phone ?? "—" },
                  { label: "Receipts", value: String(s.receiptCount) },
                ]}
                action={
                  <AstuAction onClick={() => openEdit(s)}>
                    <Pencil className="h-3 w-3" /> Edit
                  </AstuAction>
                }
              />
            ))}
          </div>

          {/* ── DataTable (sm+) ── */}
          <div className="hidden sm:block">
            <DataTable
              columns={columns}
              data={data.items}
              searchValue={search}
              onSearchChange={(v) => { setSearch(v); setPage(1); }}
              searchPlaceholder="Search by code, name, contact…"
              disableClientSearch
              manualPagination={{
                page,
                pageSize,
                total: data.total,
                onPage: setPage,
                onPageSize: (s) => { setPageSize(s); setPage(1); },
              }}
              toolbarRight={
                <Button size="sm" className="h-8 text-xs" onClick={openCreate}>
                  <Plus className="h-3.5 w-3.5" /> New
                </Button>
              }
              bulkActions={(rows, clearSelection) => (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-xs text-success-strong border-success/40 hover:bg-success-subtle"
                    disabled={update.isPending}
                    onClick={() => bulkSetStatus(rows, "ACTIVE", clearSelection)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Activate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-xs text-warning-strong border-warning/40 hover:bg-warning-subtle"
                    disabled={update.isPending}
                    onClick={() => bulkSetStatus(rows, "INACTIVE", clearSelection)}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Deactivate
                  </Button>
                </>
              )}
            />
          </div>
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-primary">{editing ? "Edit Supplier" : "New Supplier"}</DialogTitle>
            <DialogDescription>{editing ? `Editing ${editing.code}` : "Register a new supplier"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Name *</Label>
              <Input {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Contact Person</Label>
                <Input {...form.register("contactPerson")} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Phone</Label>
                <Input {...form.register("phone")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Email</Label>
              <Input type="email" {...form.register("email")} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Address</Label>
              <Input {...form.register("address")} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v as "ACTIVE" | "INACTIVE" | "BLACKLISTED")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="BLACKLISTED">Blacklisted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={create.isPending || update.isPending}
                className="bg-primary hover:bg-primary-strong text-primary-foreground"
              >
                {editing ? "Save Changes" : "Create Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
