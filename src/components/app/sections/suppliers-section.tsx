"use client";

import { useState } from "react";
import { Plus, Search, Truck, Pencil } from "lucide-react";
import { useSuppliers, useCreateSupplier, useUpdateSupplier } from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, SectionError, SectionLoading, EmptyState, Pagination, AstuAction, AstuCardTable, ResponsiveTable, MobileCard, StatusPill } from "@/components/app/section-utils";
import { statusColor } from "@/lib/utils/format";
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
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const { data, isLoading, isError, refetch } = useSuppliers({ page, limit, search: search || undefined, status: status || undefined });
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

      <Card className="mb-4 p-3 border border-border shadow-sm">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 h-9" placeholder="Search by code, name, contact..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={status || "ALL"} onValueChange={(v) => { setStatus(v === "ALL" ? "" : v); setPage(1); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="BLACKLISTED">Blacklisted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? <SectionLoading variant="table" /> :
       isError ? <SectionError message="Failed to load suppliers" onRetry={() => refetch()} /> :
       !data || data.items.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No suppliers yet"
          description="Register your first supplier to start tracking goods received and supplier performance."
          actionLabel="New Supplier"
          onAction={openCreate}
        />
       ) : (
        <ResponsiveTable
          footerAction={<AstuAction onClick={openCreate}>+ New</AstuAction>}
          mobileCards={data.items.map((s) => (
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
                  <span className="inline-flex items-center gap-1"><Pencil className="h-3 w-3" />Edit</span>
                </AstuAction>
              }
            />
          ))}
        >
          <table className="astu-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Phone</th>
                <th className="text-right">Receipts</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((s) => (
                <tr key={s.id}>
                  <td className="font-mono text-xs">{s.code}</td>
                  <td className="font-medium text-sm">{s.name}</td>
                  <td className="text-xs">{s.contactPerson ?? "—"}</td>
                  <td className="text-xs">{s.phone ?? "—"}</td>
                  <td className="text-right">{s.receiptCount}</td>
                  <td><Badge variant={statusColor(s.status)} className="text-[10px]">{s.status}</Badge></td>
                  <td>
                    <AstuAction onClick={() => openEdit(s)}>
                      <span className="inline-flex items-center gap-1"><Pencil className="h-3 w-3" />Edit</span>
                    </AstuAction>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPage={setPage} />
        </ResponsiveTable>
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
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
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
              <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v as any)}>
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
              <Button type="submit" disabled={create.isPending || update.isPending} className="bg-primary hover:bg-primary-strong text-primary-foreground">
                {editing ? "Save Changes" : "Create Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
