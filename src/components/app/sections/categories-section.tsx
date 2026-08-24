"use client";

import { useState } from "react";
import { Plus, FolderTree } from "lucide-react";
import { useCategoriesAndUoms, useCreateCategory } from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader, SectionError, SectionLoading, EmptyState, AstuCardTable } from "@/components/app/section-utils";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const Schema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional(),
});

type Form = z.infer<typeof Schema>;

export function CategoriesSection() {
  const { data, isLoading, isError, refetch } = useCategoriesAndUoms();
  const create = useCreateCategory();
  const [open, setOpen] = useState(false);

  const form = useForm<Form>({ resolver: zodResolver(Schema), defaultValues: { code: "", name: "", description: "" } });

  const onSubmit = async (values: Form) => {
    try {
      await create.mutateAsync(values);
      toast.success("Category created");
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
        title="Categories & Units"
        description="Classify inventory items and define units of measure"
        icon={FolderTree}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" /> New Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="text-primary">New Category</DialogTitle></DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Code *</Label>
                  <Input {...form.register("code")} placeholder="e.g. ELEC" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Name *</Label>
                  <Input {...form.register("name")} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Description</Label>
                  <Input {...form.register("description")} />
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
      {isLoading ? <SectionLoading variant="table" /> :
       isError ? <SectionError message="Failed to load" onRetry={() => refetch()} /> :
       !data || data.categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No categories yet"
          description="Create categories to classify inventory items, then add units of measure for accurate stock tracking."
          actionLabel="New Category"
          onAction={() => setOpen(true)}
        />
       ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <AstuCardTable title={`Categories (${data.categories.length})`}>
            <table className="astu-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th className="text-right">Items</th>
                </tr>
              </thead>
              <tbody>
                {data.categories.map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono text-xs">{c.code}</td>
                    <td className="font-medium text-sm">{c.name}</td>
                    <td className="text-right">{c.itemCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AstuCardTable>
          <AstuCardTable title={`Units of Measure (${data.uoms.length})`}>
            <table className="astu-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {data.uoms.map((u) => (
                  <tr key={u.id}>
                    <td className="font-mono text-xs">{u.code}</td>
                    <td className="text-sm">{u.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AstuCardTable>
        </div>
      )}
    </div>
  );
}
