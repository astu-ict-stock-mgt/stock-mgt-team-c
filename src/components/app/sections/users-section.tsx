"use client";

import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Users, CheckCircle2, XCircle } from "lucide-react";
import { useUsers, useRoles, useCreateUser, useUpdateUser } from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader, SectionError, SectionLoading, EmptyState, MobileCard, StatusPill } from "@/components/app/section-utils";
import { statusColor, formatRelative, roleDisplayName } from "@/lib/utils/format";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

/* ── Row type (inferred from useUsers response) ─────────────────── */
type UserRow = {
  id: string;
  email: string;
  username: string;
  fullName: string;
  status: string;
  department: string | null;
  phoneNumber: string | null;
  lastLoginAt: string | null;
  roles: { id: string; name: string }[];
};

const Schema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  fullName: z.string().min(2),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .refine(
      (password) => /[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password),
      { message: "Password must contain at least one number or special character" }
    ),
  department: z.string().optional(),
  phoneNumber: z.string().optional(),
});
type Form = z.infer<typeof Schema>;

export function UsersSection() {
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(25);
  const [search, setSearch]       = useState("");
  const [status, setStatus]       = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useUsers({
    page,
    limit: pageSize,
    search: search || undefined,
    status: status || undefined,
  });
  const roles      = useRoles();
  const create     = useCreateUser();
  const updateUser = useUpdateUser();

  const form = useForm<Form>({
    resolver: zodResolver(Schema),
    defaultValues: { email: "", username: "", fullName: "", password: "", department: "", phoneNumber: "" },
  });
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const toggleRole = (id: string) =>
    setSelectedRoleIds((arr) => arr.includes(id) ? arr.filter((r) => r !== id) : [...arr, id]);

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

  /* ── Bulk status update helper ──────────────────────────────────── */
  const bulkSetStatus = async (
    rows: UserRow[],
    newStatus: "ACTIVE" | "INACTIVE",
    clearSelection: () => void
  ) => {
    const toChange = rows.filter((r) => r.status !== newStatus);
    if (toChange.length === 0) {
      toast.info(`All selected users are already ${newStatus.toLowerCase()}`);
      return;
    }
    try {
      await Promise.all(toChange.map((r) => updateUser.mutateAsync({ id: r.id, status: newStatus })));
      toast.success(
        `${toChange.length} user${toChange.length !== 1 ? "s" : ""} set to ${newStatus.toLowerCase()}`
      );
      clearSelection();
      refetch();
    } catch {
      toast.error("Some updates failed — please try again");
    }
  };

  /* ── Column definitions ─────────────────────────────────────────── */
  const columns = useMemo<ColumnDef<UserRow, unknown>[]>(() => [
    {
      id: "fullName",
      accessorKey: "fullName",
      header: "Name",
      meta: { label: "Name" },
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm leading-tight">{row.original.fullName}</p>
          <p className="text-xs text-muted-foreground">@{row.original.username}</p>
        </div>
      ),
    },
    {
      id: "email",
      accessorKey: "email",
      header: "Email",
      meta: { label: "Email" },
      cell: ({ getValue }) => <span className="text-xs">{getValue() as string}</span>,
    },
    {
      id: "department",
      accessorKey: "department",
      header: "Department",
      meta: { label: "Department" },
      cell: ({ getValue }) => (
        <span className="text-xs">{(getValue() as string | null) ?? "—"}</span>
      ),
      size: 130,
    },
    {
      id: "roles",
      header: "Roles",
      meta: { label: "Roles" },
      enableSorting: false,
      accessorFn: (row) => row.roles.map((r) => roleDisplayName(r.name)).join(", "),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.roles.map((r) => (
            <Badge key={r.id} variant="secondary" className="text-[10px]">
              {roleDisplayName(r.name)}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: "lastLoginAt",
      accessorKey: "lastLoginAt",
      header: "Last Login",
      meta: { label: "Last Login" },
      cell: ({ getValue }) => (
        <span className="text-xs">{formatRelative(getValue() as string | null)}</span>
      ),
      size: 130,
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      meta: { label: "Status" },
      enableSorting: false,
      cell: ({ getValue }) => <StatusPill status={getValue() as string} />,
      size: 110,
    },
  ], []);

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage user accounts, roles, and permissions"
        icon={Users}
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4" /> New User</Button>
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
                  <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto rounded border border-border bg-surface-2 p-2">
                    {roles.data?.items.map((r) => {
                      const checked = selectedRoleIds.includes(r.id);
                      return (
                        <label
                          key={r.id}
                          className={`flex cursor-pointer items-center gap-2 rounded border p-1.5 text-xs transition-colors ${
                            checked
                              ? "border-primary bg-accent text-primary"
                              : "border-border bg-card hover:bg-surface-2"
                          }`}
                        >
                          <Checkbox checked={checked} onCheckedChange={() => toggleRole(r.id)} />
                          <span>{roleDisplayName(r.name)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button
                    type="submit"
                    disabled={create.isPending}
                    className="bg-primary hover:bg-primary-strong text-primary-foreground"
                  >
                    {create.isPending ? "Creating..." : "Create User"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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
            <SelectItem value="LOCKED">Locked</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <SectionLoading variant="table" /> :
       isError ? <SectionError message="Failed to load users" onRetry={() => refetch()} /> :
       !data ? null : data.total === 0 && !search && !status ? (
        <EmptyState
          icon={Users}
          title="No users yet"
          description="Create the first user account and assign roles to control access to the system."
          actionLabel="New User"
          onAction={() => setCreateOpen(true)}
        />
       ) : (
        <>
          {/* ── Mobile card list (< sm) ── */}
          <div className="sm:hidden astu-card overflow-hidden">
            {data.items.map((u) => (
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
          </div>

          {/* ── DataTable (sm+) ── */}
          <div className="hidden sm:block">
            <DataTable
              columns={columns}
              data={data.items}
              searchValue={search}
              onSearchChange={(v) => { setSearch(v); setPage(1); }}
              searchPlaceholder="Search by name, email, username…"
              disableClientSearch
              manualPagination={{
                page,
                pageSize,
                total: data.total,
                onPage: setPage,
                onPageSize: (s) => { setPageSize(s); setPage(1); },
              }}
              toolbarRight={
                <Button size="sm" className="h-8 text-xs" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-3.5 w-3.5" /> New
                </Button>
              }
              bulkActions={(rows, clearSelection) => (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-xs text-success-strong border-success/40 hover:bg-success-subtle"
                    disabled={updateUser.isPending}
                    onClick={() => bulkSetStatus(rows, "ACTIVE", clearSelection)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Activate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-xs text-warning-strong border-warning/40 hover:bg-warning-subtle"
                    disabled={updateUser.isPending}
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
    </div>
  );
}
