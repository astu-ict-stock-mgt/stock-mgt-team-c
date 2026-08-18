"use client";

import { Settings as SettingsIcon, ShieldCheck, Database, GitBranch, Server, Package, KeyRound, User as UserIcon, Save, Building2, Phone, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, SectionError, SectionLoading } from "@/components/app/section-utils";
import { useMe, useChangePassword, useUpdateProfile } from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import { roleDisplayName } from "@/lib/utils/format";
import { useUIStore } from "@/stores/ui-store";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const PasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type PasswordForm = z.infer<typeof PasswordSchema>;

const ProfileSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  department: z.string().optional(),
  phoneNumber: z.string().optional(),
});

type ProfileForm = z.infer<typeof ProfileSchema>;

/** Flush card header — hairline rule, tone-tinted icon, ink title. */
function CardBar({ icon: Icon, title, tone = "primary" }: { icon: React.ComponentType<{ className?: string }>; title: string; tone?: "primary" | "danger" | "muted" }) {
  const iconTone = tone === "danger" ? "text-danger" : tone === "muted" ? "text-muted-foreground" : "text-primary";
  return (
    <div className="flex items-center gap-2 border-b border-border px-4 py-3">
      <Icon className={`h-4 w-4 ${iconTone}`} />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
  );
}

export function SettingsSection() {
  const { data: me, isLoading, isError, refetch } = useMe();
  const tab = useUIStore((s) => s.settingsTab);
  const setTab = useUIStore((s) => s.setSettingsTab);

  const isAdmin = Boolean(me?.user.roles.some((role) => role.name === "ADMINISTRATOR"));

  if (!isLoading && me && !isAdmin && tab === "system") {
    setTab("profile");
  }

  if (isLoading) return <SectionLoading />;
  if (isError || !me) return <SectionError message="Failed to load user data" onRetry={() => refetch()} />;

  const triggerCls =
    "rounded-md px-3.5 py-1.5 text-sm data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-inset data-[state=active]:ring-border";

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your account, security, and system configuration"
        icon={SettingsIcon}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "profile" | "security" | "system")}>
        <TabsList className="mb-5 inline-flex h-auto gap-1 rounded-lg border border-border bg-surface-2 p-1">
          <TabsTrigger value="profile" className={triggerCls}>
            <UserIcon className="mr-1.5 h-3.5 w-3.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="security" className={triggerCls}>
            <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Security
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="system" className={triggerCls}>
              <Server className="mr-1.5 h-3.5 w-3.5" /> System
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile"><ProfileTab user={me.user} /></TabsContent>
        <TabsContent value="security"><SecurityTab /></TabsContent>
        {isAdmin && <TabsContent value="system"><SystemTab /></TabsContent>}
      </Tabs>
    </div>
  );
}

function ProfileTab({ user }: { user: any }) {
  const updateProfile = useUpdateProfile();
  const form = useForm<ProfileForm>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      fullName: user.fullName,
      department: user.department ?? "",
      phoneNumber: user.phoneNumber ?? "",
    },
  });

  const onSubmit = async (values: ProfileForm) => {
    try {
      await updateProfile.mutateAsync({
        fullName: values.fullName,
        department: values.department || null,
        phoneNumber: values.phoneNumber || null,
      });
      toast.success("Profile updated successfully");
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to update profile");
    }
  };

  return (
    <div className="astu-card max-w-3xl overflow-hidden">
      <CardBar icon={UserIcon} title="My Profile" />
      <div className="p-5">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Read-only fields */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-xs font-semibold"><Mail className="h-3 w-3" /> Email</Label>
              <Input value={user.email} disabled className="bg-surface-2" />
              <p className="text-[10px] text-muted-foreground">Email cannot be changed — contact an administrator</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Username</Label>
              <Input value={user.username} disabled className="bg-surface-2" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-xs font-semibold"><UserIcon className="h-3 w-3" /> Full Name *</Label>
            <Input {...form.register("fullName")} placeholder="Enter your full name" />
            {form.formState.errors.fullName && <p className="text-xs text-danger">{form.formState.errors.fullName.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-xs font-semibold"><Building2 className="h-3 w-3" /> Department</Label>
              <Input {...form.register("department")} placeholder="e.g. IT, Finance, Stores" />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-xs font-semibold"><Phone className="h-3 w-3" /> Phone</Label>
              <Input {...form.register("phoneNumber")} placeholder="+251911000000" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Assigned Roles</Label>
            <div className="flex flex-wrap gap-1.5 rounded-md border border-border bg-surface p-2">
              {user.roles.length === 0 ? (
                <span className="text-xs text-muted-foreground">No roles assigned</span>
              ) : (
                user.roles.map((r: any) => (
                  <Badge key={r.id} variant="secondary" className="text-[10px]">{roleDisplayName(r.name)}</Badge>
                ))
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">Roles are managed by an administrator in the Users section</p>
          </div>

          <div className="border-t border-border pt-4">
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? (
                <>Saving...</>
              ) : (
                <><Save className="h-4 w-4" /> Save Changes</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SecurityTab() {
  const changePassword = useChangePassword();
  const form = useForm<PasswordForm>({
    resolver: zodResolver(PasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values: PasswordForm) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success("Password changed successfully");
      form.reset();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to change password");
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="astu-card overflow-hidden">
        <CardBar icon={KeyRound} title="Change Password" tone="danger" />
        <div className="p-5">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Current Password *</Label>
              <Input type="password" {...form.register("currentPassword")} placeholder="Enter your current password" />
              {form.formState.errors.currentPassword && <p className="text-xs text-danger">{form.formState.errors.currentPassword.message}</p>}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">New Password *</Label>
                <Input type="password" {...form.register("newPassword")} placeholder="At least 6 characters" />
                {form.formState.errors.newPassword && <p className="text-xs text-danger">{form.formState.errors.newPassword.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Confirm New Password *</Label>
                <Input type="password" {...form.register("confirmPassword")} placeholder="Re-enter new password" />
                {form.formState.errors.confirmPassword && <p className="text-xs text-danger">{form.formState.errors.confirmPassword.message}</p>}
              </div>
            </div>
            <div className="rounded-md border border-warning/40 bg-warning-subtle p-2.5 text-xs text-warning-strong">
              After changing your password, all active sessions on other devices will remain valid until they expire.
            </div>
            <div className="border-t border-border pt-4">
              <Button type="submit" disabled={changePassword.isPending} className="bg-danger text-danger-foreground hover:bg-danger-strong">
                {changePassword.isPending ? (
                  <>Changing...</>
                ) : (
                  <><KeyRound className="h-4 w-4" /> Change Password</>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className="astu-card overflow-hidden">
        <CardBar icon={ShieldCheck} title="Security Settings" tone="muted" />
        <div className="space-y-2 p-4">
          <div className="flex items-center justify-between text-xs">
            <span>Two-Factor Authentication</span>
            <Badge variant="secondary" className="text-[10px]">Not configured</Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span>Session timeout</span>
            <Badge variant="outline" className="font-mono text-[10px]">12 hours</Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span>Password hashing</span>
            <Badge variant="outline" className="font-mono text-[10px]">bcrypt / 10 rounds</Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span>Failed login lockout</span>
            <Badge variant="outline" className="font-mono text-[10px]">5 attempts → 15 min</Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span>Audit logging</span>
            <Badge className="bg-success text-[10px]">Enabled</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

function SystemTab() {
  const groups: { icon: React.ComponentType<{ className?: string }>; title: string; items: string[] }[] = [
    {
      icon: ShieldCheck, title: "Security", items: [
        "Password hashing via bcrypt (10 rounds)",
        "Bearer token sessions (12-hour expiry)",
        "RBAC enforced on every API endpoint",
        "Account lockout after 5 failed logins",
        "Audit logging on all mutations",
        "Centralized error handling with sanitized responses",
      ],
    },
    {
      icon: Database, title: "Database", items: [
        "Prisma ORM with normalized relational schema",
        "UUIDs (cuid) for all primary keys",
        "Soft-delete on users, suppliers, inventory, stores",
        "Atomic transactions for stock movements",
        "FIFO layers maintain full inventory history",
        "Indexed on frequently queried fields",
      ],
    },
    {
      icon: Server, title: "API", items: [
        "Versioned REST API under /api/v1/*",
        "Controller → Service → Repository layering",
        "Zod validation on every input",
        "Consistent response envelope",
        "Health check at /api/v1/health",
        "Standardized error codes",
      ],
    },
    {
      icon: GitBranch, title: "Architecture", items: [
        "Next.js 16 App Router + TypeScript",
        "Frontend never touches Prisma directly",
        "TanStack Query for server state",
        "React Hook Form + Zod for forms",
        "shadcn/ui component library",
        "Zustand for client UI state",
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {groups.map((g) => (
          <div key={g.title} className="astu-card p-4">
            <div className="mb-2 flex items-center gap-2">
              <g.icon className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">{g.title}</h3>
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {g.items.map((it) => (
                <li key={it} className="flex gap-1.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/50" />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="astu-card overflow-hidden">
        <CardBar icon={Package} title="Default Demo Credentials" />
        <div className="p-4">
          <p className="mb-3 text-xs text-muted-foreground">
            Password for all accounts:{" "}
            <code className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-danger">
              Password@123
            </code>
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
            {[
              ["admin@sms.et", "Administrator"],
              ["pao@sms.et", "PAO"],
              ["storekeeper@sms.et", "Storekeeper"],
              ["clerk@sms.et", "Stock Clerk"],
              ["accountant@sms.et", "Accountant"],
              ["depthead@sms.et", "Department Head"],
              ["security@sms.et", "Security Officer"],
              ["supplier@sms.et", "Supplier"],
            ].map(([email, role]) => (
              <div key={email} className="rounded-md border border-border bg-card p-2 transition-colors hover:border-primary">
                <p className="font-mono text-xs">{email}</p>
                <p className="text-[10px] text-muted-foreground">{role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
