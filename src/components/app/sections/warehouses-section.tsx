"use client";

import { useState } from "react";
import { Plus, Warehouse as WarehouseIcon } from "lucide-react";
import { useWarehouses, useCreateWarehouse } from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader, SectionError, SectionLoading, SectionEmpty, StatusPill } from "@/components/app/section-utils";
import { formatNumber } from "@/lib/utils/format";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const Schema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  location: z.string().optional(),
});

type Form = z.infer<typeof Schema>;

export function WarehousesSection() {
  const { data, isLoading, isError, refetch } = useWarehouses();
  const create = useCreateWarehouse();
  const [open, setOpen] = useState(false);

  const form = useForm<Form>({ resolver: zodResolver(Schema), defaultValues: { code: "", name: "", location: "" } });

  const onSubmit = async (values: Form) => {
    try {
      await create.mutateAsync(values);
      toast.success("Warehouse created");
      setOpen(false);
      form.reset();
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed");
    }
  };

  return (
    <div>
      <PageHeader
        title="Warehouses"
        description="Manage storage locations"
        icon={WarehouseIcon}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" /> New Warehouse
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="text-primary">New Warehouse</DialogTitle></DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Code *</Label>
                  <Input {...form.register("code")} placeholder="e.g. WH-MAIN" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Name *</Label>
                  <Input {...form.register("name")} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Location</Label>
                  <Input {...form.register("location")} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={create.isPending} className="bg-primary hover:bg-primary-strong text-primary-foreground">Create</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      {isLoading ? <SectionLoading /> :
       isError ? <SectionError message="Failed to load" onRetry={() => refetch()} /> :
       !data || data.items.length === 0 ? <SectionEmpty title="No warehouses yet" /> : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data.items.map((w) => (
            <div key={w.id} className="astu-card astu-card-hover overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-primary ring-1 ring-inset ring-border">
                    <WarehouseIcon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{w.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{w.code}</p>
                  </div>
                </div>
                <StatusPill status={w.status} />
              </div>
              <div className="p-4">
                <p className="mb-3 text-xs text-muted-foreground">{w.location ?? "No location"}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-border bg-surface p-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Items</p>
                    <p className="mt-0.5 text-lg font-semibold tabular text-foreground">{w.itemCount}</p>
                  </div>
                  <div className="rounded-md border border-border bg-surface p-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Units</p>
                    <p className="mt-0.5 text-lg font-semibold tabular text-foreground">{formatNumber(w.totalUnits)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
