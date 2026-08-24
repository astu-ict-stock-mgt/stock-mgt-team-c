"use client";

import { useState } from "react";
import { Plus, Search, Users, Check } from "lucide-react";
import { useUsers, useRoles, useCreateUser } from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader, SectionError, SectionLoading, EmptyState, Pagination, AstuAction, AstuCardTable, ResponsiveTable, MobileCard, StatusPill } from "@/components/app/section-utils";
import { statusColor, formatRelative, roleDisplayName } from "@/lib/utils/format";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const Schema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  fullName: z.string().min(2),
  password: z.string().min(6),
  department: z.string().optional(),
  phoneNumber: z.string().optional(),
});

type Form = z.infer<typeof Schema>;

export function UsersSection() {
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useUsers({ page, limit, search: search || undefined, status: status || undefined });
  const roles = useRoles();
  const create = useCreateUser();

  const form = useForm<Form>({ resolver: zodResolver(Schema), defaultValues: { email: "", username: "", fullName: "", password: "", department: "", phoneNumber: "" } });
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  const toggleRole = (id: string) => setSelectedRoleIds((arr) => arr.includes(id) ? arr.filter((r) => r !== id) : [...arr, id]);

  const onSubmit = async (values: Form) => {
    if (selectedRoleIds.length === 0) return toast.error("Select at least one role");
    try {
      await create.mutateAsync({ ...values, roleIds: selectedRoleIds });
      toast.success("User created");
      setCreateOpen(false);
      form.reset();
      setSelectedRoleIds([]);
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed");
    }
  };

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage user accounts, roles, and permissions"
        icon={Users}
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" /> New User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-primary">Create User</DialogTitle>
                <DialogDescription>Register a new user and assign roles</DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Full Name *</Label>
                    <Input {...form.register("fullName")} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Username *</Label>
                    <Input {...form.register("username")} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Email *</Label>
                  <Input type="email" {...form.register("email")} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Password *</Label>
                  <Input type="password" {...form.register("password")} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Department</Label>
                    <Input {...form.register("department")} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Phone</Label>
                    <Input {...form.register("phoneNumber")} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Roles *</Label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto border border-border rounded p-2 bg-surface-2">
                    {roles.data?.items.map((r) => {
                      const checked = selectedRoleIds.includes(r.id);
                      return (
                        <label key={r.id} className={`flex items-center gap-2 p-1.5 rounded border text-xs cursor-pointer transition-colors ${checked ? "border-primary bg-accent text-primary" : "border-border bg-card hover:bg-surface-2"}`}>
                          <Checkbox checked={checked} onCheckedChange={() => toggleRole(r.id)} />
                          <span>{roleDisplayName(r.name)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={create.isPending} className="bg-primary hover:bg-primary-strong text-primary-foreground">
                    {create.isPending ? "Creating..." : "Create User"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="mb-4 p-3 border border-border shadow-sm">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 h-9" placeholder="Search by name, email, username..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={status || "ALL"} onValueChange={(v) => { setStatus(v === "ALL" ? "" : v); setPage(1); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="LOCKED">Locked</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? <SectionLoading variant="table" /> :
       isError ? <SectionError message="Failed to load users" onRetry={() => refetch()} /> :
       !data || data.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users yet"
          description="Create the first user account and assign roles to control access to the system."
          actionLabel="New User"
          onAction={() => setCreateOpen(true)}
        />
       ) : (
        <ResponsiveTable
          footerAction={<AstuAction onClick={() => setCreateOpen(true)}>+ New</AstuAction>}
          mobileCards={data.items.map((u) => (
            <MobileCard
              key={u.id}
              primary={u.fullName}
              secondary={u.email}
              badge={<StatusPill status={u.status} />}
              meta={[
                { label: "Username",   value: `@${u.username}` },
                { label: "Department", value: u.department ?? "—" },
                { label: "Roles",      value: u.roles.map((r) => roleDisplayName(r.name)).join(", ") || "—" },
                { label: "Last Login", value: formatRelative(u.lastLoginAt) },
              ]}
            />
          ))}
        >
          <table className="astu-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Roles</th>
                <th>Last Login</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id}>
                  <td>
                    <p className="font-medium text-sm">{u.fullName}</p>
                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                  </td>
                  <td className="text-xs">{u.email}</td>
                  <td className="text-xs">{u.department ?? "—"}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => <Badge key={r.id} variant="secondary" className="text-[10px]">{roleDisplayName(r.name)}</Badge>)}
                    </div>
                  </td>
                  <td className="text-xs">{formatRelative(u.lastLoginAt)}</td>
                  <td><Badge variant={statusColor(u.status)} className="text-[10px]">{u.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPage={setPage} />
        </ResponsiveTable>
      )}
    </div>
  );
}
