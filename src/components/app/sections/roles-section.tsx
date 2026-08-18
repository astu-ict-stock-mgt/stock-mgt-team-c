"use client";

import { useState } from "react";
import { Plus, Shield, Pencil, Trash2, Check, X, Search } from "lucide-react";
import { useRoles, useCreateRole, useUpdateRole, useTogglePermission, useDeleteRole } from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, SectionError, SectionLoading, SectionEmpty, AstuAction } from "@/components/app/section-utils";
import { roleDisplayName } from "@/lib/utils/format";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// All permissions grouped by module (mirrors constants/permissions.ts)
const ALL_PERMISSIONS_BY_MODULE: Record<string, string[]> = {
  "Users & RBAC": ["users.read", "users.create", "users.update", "users.delete", "roles.read", "roles.manage", "permissions.read"],
  "Suppliers": ["suppliers.read", "suppliers.create", "suppliers.update", "suppliers.delete"],
  "Categories & UoM": ["categories.read", "categories.create", "categories.update", "categories.delete"],
  "Stores": ["warehouses.read", "warehouses.create", "warehouses.update", "warehouses.delete"],
  "Inventory": ["inventory.read", "inventory.create", "inventory.update", "inventory.delete"],
  "Stock Operations": ["stock.receive", "stock.issue", "stock.transfer", "stock.adjust"],
  "Requisitions": ["requisition.create", "requisition.approve", "requisition.read"],
  "Stock Taking": ["stocktake.create", "stocktake.approve", "stocktake.read"],
  "Damaged & Obsolete": ["damaged.manage", "obsolete.manage"],
  "Gate Passes": ["gatepass.request", "gatepass.approve", "gatepass.read"],
  "Reports & Audit": ["reports.view", "reports.export", "audit.view"],
  "Dashboard": ["dashboard.view"],
};

const SYSTEM_ROLES = ["ADMINISTRATOR", "PAO", "STOREKEEPER", "STOCK_CLERK", "ACCOUNTANT", "DEPARTMENT_HEAD", "SECURITY_OFFICER", "SUPPLIER"];

const CreateSchema = z.object({
  name: z.string().min(2, "Role name is required"),
  description: z.string().optional(),
});

type CreateForm = z.infer<typeof CreateSchema>;

export function RolesSection() {
  const { data, isLoading, isError, refetch } = useRoles();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const togglePermission = useTogglePermission();

  const form = useForm<CreateForm>({
    resolver: zodResolver(CreateSchema),
    defaultValues: { name: "", description: "" },
  });

  const openCreate = () => {
    form.reset({ name: "", description: "" });
    setCreateOpen(true);
  };

  const onCreate = async (values: CreateForm) => {
    try {
      await createRole.mutateAsync({ ...values, permissionIds: [] });
      toast.success("Role created");
      setCreateOpen(false);
      form.reset();
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed");
    }
  };

  const onTogglePermission = async (roleId: string, roleName: string, permission: string, enable: boolean) => {
    try {
      await togglePermission.mutateAsync({ roleId, permission, enable });
      toast.success(`${enable ? "Granted" : "Revoked"} "${permission}" for ${roleDisplayName(roleName)}`);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed");
    }
  };

  const onDeleteRole = async (id: string, name: string) => {
    if (!confirm(`Delete role "${roleDisplayName(name)}"? Users assigned to this role must be reassigned first.`)) return;
    try {
      await deleteRole.mutateAsync(id);
      toast.success("Role deleted");
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed");
    }
  };

  const filteredRoles = data?.items.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.description?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description="Role-based access control matrix — click permission badges to toggle"
        icon={Shield}
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Role
          </Button>
        }
      />

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8 h-9"
          placeholder="Search roles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? <SectionLoading /> :
       isError ? <SectionError message="Failed to load roles" onRetry={() => refetch()} /> :
       !data || data.items.length === 0 ? <SectionEmpty title="No roles defined" /> : (
        <div className="space-y-3">
          {filteredRoles.map((r) => {
            const isSystem = SYSTEM_ROLES.includes(r.name);
            const isAdmin = r.name === "ADMINISTRATOR";
            const isEditing = editingRole === r.id;
            return (
              <RoleCard
                key={r.id}
                role={r}
                isSystem={isSystem}
                isAdmin={isAdmin}
                isEditing={isEditing}
                onTogglePermission={onTogglePermission}
                onToggleEdit={() => setEditingRole(isEditing ? null : r.id)}
                onDelete={() => onDeleteRole(r.id, r.name)}
                onUpdate={async (description) => {
                  try {
                    await updateRole.mutateAsync({ id: r.id, description });
                    toast.success("Description updated");
                    setEditingRole(null);
                  } catch (e) {
                    toast.error(e instanceof ApiClientError ? e.message : "Failed");
                  }
                }}
                togglingPermission={togglePermission.isPending}
              />
            );
          })}
        </div>
      )}

      {/* Create role dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-primary">Create New Role</DialogTitle>
            <DialogDescription>Define a new role — you can assign permissions after creation</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onCreate)} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Role Name *</Label>
              <Input {...form.register("name")} placeholder="e.g. WAREHOUSE_MANAGER" />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea {...form.register("description")} placeholder="Brief description of the role" rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createRole.isPending} className="bg-primary hover:bg-primary-strong text-primary-foreground">
                {createRole.isPending ? "Creating..." : "Create Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoleCard({
  role,
  isSystem,
  isAdmin,
  isEditing,
  onTogglePermission,
  onToggleEdit,
  onDelete,
  onUpdate,
  togglingPermission,
}: {
  role: { id: string; name: string; description: string | null; userCount: number; permissions: string[] };
  isSystem: boolean;
  isAdmin: boolean;
  isEditing: boolean;
  onTogglePermission: (roleId: string, roleName: string, permission: string, enable: boolean) => void;
  onToggleEdit: () => void;
  onDelete: () => void;
  onUpdate: (description: string) => Promise<void>;
  togglingPermission: boolean;
}) {
  const [descDraft, setDescDraft] = useState(role.description ?? "");

  const permissionSet = new Set(role.permissions);

  return (
    <Card className="overflow-hidden border border-border shadow-sm">
      <CardHeader className="bg-surface/60 border-b border-border py-3 px-4">
        <CardTitle className="text-sm flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-semibold">{roleDisplayName(role.name)}</span>
            {isSystem && (
              <Badge variant="outline" className="text-[9px] border-primary text-primary">SYSTEM</Badge>
            )}
            {isAdmin && (
              <Badge variant="default" className="text-[9px] bg-primary">SUPER ADMIN</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">{role.userCount} users</Badge>
            <Badge variant="outline" className="text-[10px] font-mono">{role.permissions.length} perms</Badge>
            {!isAdmin && (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleEdit} title={isEditing ? "Done" : "Edit description"}>
                  {isEditing ? <Check className="h-3 w-3 text-success" /> : <Pencil className="h-3 w-3" />}
                </Button>
                {!isSystem && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10" onClick={onDelete} title="Delete role">
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardTitle>

        {/* Description - inline editable */}
        {isEditing ? (
          <div className="mt-2 space-y-1">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
            <div className="flex gap-2">
              <Textarea
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                rows={2}
                className="text-xs"
              />
              <div className="flex flex-col gap-1">
                <Button size="sm" className="h-7 bg-primary hover:bg-primary-strong text-primary-foreground" onClick={() => onUpdate(descDraft)}>
                  <Check className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-7" onClick={onToggleEdit}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          role.description && <p className="text-xs text-muted-foreground mt-1">{role.description}</p>
        )}
      </CardHeader>

      <CardContent className="p-4">
        {isAdmin ? (
          <div className="rounded-md bg-accent border border-primary/20 p-3 text-xs text-primary mb-3">
            <strong>Administrator role:</strong> Always has all permissions. Cannot be modified.
          </div>
        ) : (
          <div className="rounded-md bg-warning-subtle border border-warning/40 p-2 mb-3 text-xs text-warning-strong">
            💡 Click any permission badge below to <strong>toggle</strong> it on/off for this role. Green = enabled, gray = disabled.
          </div>
        )}

        <div className="space-y-3">
          {Object.entries(ALL_PERMISSIONS_BY_MODULE).map(([moduleName, perms]) => {
            const moduleEnabledCount = perms.filter(p => permissionSet.has(p)).length;
            return (
              <div key={moduleName} className="border-l-2 border-primary/30 pl-3">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{moduleName}</h4>
                  <span className="text-[10px] text-muted-foreground font-mono">{moduleEnabledCount}/{perms.length}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {perms.map((perm) => {
                    const isEnabled = permissionSet.has(perm);
                    const isDisabled = isAdmin || togglingPermission;
                    return (
                      <button
                        key={perm}
                        onClick={() => !isAdmin && onTogglePermission(role.id, role.name, perm, !isEnabled)}
                        disabled={isDisabled}
                        title={isEnabled ? "Click to revoke" : "Click to grant"}
                        className={`text-[10px] font-mono px-2 py-1 rounded border transition-all ${
                          isEnabled
                            ? "bg-success text-success-foreground border-success hover:bg-success-strong"
                            : "bg-card text-muted-foreground border-border hover:bg-surface-2 hover:border-muted-foreground"
                        } ${isAdmin ? "cursor-not-allowed opacity-90" : "cursor-pointer"}`}
                      >
                        {isEnabled && <Check className="h-2.5 w-2.5 inline mr-1" />}
                        {perm}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
