"use client";

import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Users, CheckCircle2, XCircle, Pencil, Trash2, Unlock, KeyRound, AlertTriangle } from "lucide-react";
import { useUsers, useRoles, useCreateUser, useUpdateUser, useDeleteUser, useUnlockUser, useResetUserPassword, useMe } from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

// Editing never changes the password, so it is dropped rather than made optional
// — an empty string would otherwise fail the create rules.
const EditSchema = Schema.omit({ password: true });
type EditForm = z.infer<typeof EditSchema>;

const PasswordRule = Schema.shape.password;

export function UsersSection() {
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(25);
  const [search, setSearch]       = useState("");
  const [status, setStatus]       = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing]       = useState<UserRow | null>(null);
  const [deleting, setDeleting]     = useState<UserRow | null>(null);
  const [resetting, setResetting]   = useState<UserRow | null>(null);

  const { data, isLoading, isError, refetch } = useUsers({
    page,
    limit: pageSize,
    search: search || undefined,
    status: status || undefined,
  });
  const roles      = useRoles();
  const create     = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const unlockUser = useUnlockUser();
  const resetPassword = useResetUserPassword();
  const me = useMe();

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

  const editForm = useForm<EditForm>({
    resolver: zodResolver(EditSchema),
    defaultValues: { email: "", username: "", fullName: "", department: "", phoneNumber: "" },
  });
  const [editRoleIds, setEditRoleIds] = useState<string[]>([]);
  const toggleEditRole = (id: string) =>
    setEditRoleIds((arr) => arr.includes(id) ? arr.filter((r) => r !== id) : [...arr, id]);

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setEditRoleIds(u.roles.map((r) => r.id));
    editForm.reset({
      email: u.email,
      username: u.username,
      fullName: u.fullName,
      department: u.department ?? "",
      phoneNumber: u.phoneNumber ?? "",
    });
  };

  const onEditSubmit = async (values: EditForm) => {
    if (!editing) return;
    if (editRoleIds.length === 0) return toast.error("A user needs at least one role");
    try {
      await updateUser.mutateAsync({
        id: editing.id,
        ...values,
        department: values.department || null,
        phoneNumber: values.phoneNumber || null,
        roleIds: editRoleIds,
      });
      toast.success("User updated");
      setEditing(null);
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to update user");
    }
  };

  const setStatus_ = async (u: UserRow, newStatus: "ACTIVE" | "INACTIVE") => {
    try {
      await updateUser.mutateAsync({ id: u.id, status: newStatus });
      toast.success(`${u.fullName} ${newStatus === "ACTIVE" ? "activated" : "deactivated"}`);
      refetch();
    } catch (e) {
      // The server refuses to deactivate the last administrator — surface that
      // message rather than a generic failure.
      toast.error(e instanceof ApiClientError ? e.message : "Failed to change status");
    }
  };

  const onUnlock = async (u: UserRow) => {
    try {
      await unlockUser.mutateAsync(u.id);
      toast.success(`${u.fullName} unlocked`);
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to unlock");
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    try {
      await deleteUser.mutateAsync(deleting.id);
      toast.success(`${deleting.fullName} deleted`);
      setDeleting(null);
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to delete user");
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

  const currentUserId = me.data?.user.id ?? null;

  // Rendered per row. Kept inside the section so it can reach the mutation
  // handlers without threading half a dozen callbacks through the column defs.
  function UserRowActions({ user }: { user: UserRow }) {
    const isSelf = user.id === currentUserId;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">Actions</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => openEdit(user)}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit details &amp; roles
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setResetting(user)}>
            <KeyRound className="mr-2 h-3.5 w-3.5" /> Reset password
          </DropdownMenuItem>
          {user.status === "LOCKED" ? (
            <DropdownMenuItem onClick={() => onUnlock(user)}>
              <Unlock className="mr-2 h-3.5 w-3.5" /> Unlock account
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          {user.status === "ACTIVE" ? (
            <DropdownMenuItem disabled={isSelf} onClick={() => setStatus_(user, "INACTIVE")}>
              <XCircle className="mr-2 h-3.5 w-3.5" /> Deactivate
              {isSelf ? <span className="ml-auto text-[10px] text-muted-foreground">you</span> : null}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setStatus_(user, "ACTIVE")}>
              <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Activate
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            disabled={isSelf}
            className="text-danger focus:text-danger"
            onClick={() => setDeleting(user)}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            {isSelf ? <span className="ml-auto text-[10px] text-muted-foreground">you</span> : null}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

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
    {
      id: "actions",
      header: "",
      meta: { label: "Actions" },
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => <UserRowActions user={row.original} />,
      size: 90,
    },
  ], [currentUserId]);

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage user accounts, roles, and permissions"
        icon={Users}
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New User</Button>
        }
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
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
                action={<UserRowActions user={u} />}
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

      {/* Edit details & roles */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">Edit User</DialogTitle>
            <DialogDescription>{editing ? `Editing ${editing.fullName}` : ""}</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Full Name *</Label>
                <Input {...editForm.register("fullName")} />
                {editForm.formState.errors.fullName && <p className="text-xs text-destructive">{editForm.formState.errors.fullName.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Username *</Label>
                <Input {...editForm.register("username")} />
                {editForm.formState.errors.username && <p className="text-xs text-destructive">{editForm.formState.errors.username.message}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Email *</Label>
              <Input type="email" {...editForm.register("email")} />
              {editForm.formState.errors.email && <p className="text-xs text-destructive">{editForm.formState.errors.email.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Department</Label>
                <Input {...editForm.register("department")} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Phone</Label>
                <Input {...editForm.register("phoneNumber")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Roles *</Label>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto rounded border border-border bg-surface-2 p-2">
                {roles.data?.items.map((r) => {
                  const checked = editRoleIds.includes(r.id);
                  return (
                    <label
                      key={r.id}
                      className={`flex cursor-pointer items-center gap-2 rounded border p-1.5 text-xs transition-colors ${
                        checked ? "border-primary bg-accent text-primary" : "border-border bg-card hover:bg-surface-2"
                      }`}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleEditRole(r.id)} />
                      <span>{roleDisplayName(r.name)}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Removing the administrator role from the last administrator is refused by the server.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={updateUser.isPending} className="bg-primary hover:bg-primary-strong text-primary-foreground">
                {updateUser.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ResetPasswordDialog
        user={resetting}
        onClose={() => setResetting(null)}
        onSubmit={async (newPassword) => {
          if (!resetting) return;
          try {
            await resetPassword.mutateAsync({ id: resetting.id, newPassword });
            toast.success(`Password reset — ${resetting.fullName} must sign in again`);
            setResetting(null);
          } catch (e) {
            toast.error(e instanceof ApiClientError ? e.message : "Failed to reset password");
          }
        }}
        pending={resetPassword.isPending}
      />

      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <AlertTriangle className="h-4 w-4" /> Delete user?
            </DialogTitle>
            <DialogDescription>{deleting ? `${deleting.fullName} — ${deleting.email}` : ""}</DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            The account is deactivated and hidden from the list, and every session it holds is
            ended immediately. Records it created — receipts, issues, audit entries — are kept.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button onClick={onDelete} disabled={deleteUser.isPending} className="bg-danger hover:bg-danger-strong text-danger-foreground">
              {deleteUser.isPending ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResetPasswordDialog({
  user, onClose, onSubmit, pending,
}: {
  user: UserRow | null;
  onClose: () => void;
  onSubmit: (newPassword: string) => Promise<void>;
  pending: boolean;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const parsed = PasswordRule.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Password does not meet the rules");
      return;
    }
    setError(null);
    await onSubmit(value);
    setValue("");
  };

  return (
    <Dialog open={!!user} onOpenChange={(open) => { if (!open) { onClose(); setValue(""); setError(null); } }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <KeyRound className="h-4 w-4" /> Reset password
          </DialogTitle>
          <DialogDescription>{user ? `${user.fullName} — ${user.email}` : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">New password *</Label>
          <Input type="password" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="new-password" />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <p className="text-[10px] text-muted-foreground">
            Also clears any lockout and signs the user out of every device.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={pending} className="bg-primary hover:bg-primary-strong text-primary-foreground">
            {pending ? "Resetting..." : "Reset Password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
