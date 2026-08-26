"use client";

import { useMemo, useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  Truck,
  FolderTree,
  Warehouse as WarehouseIcon,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  FileText,
  BarChart3,
  ScrollText,
  Users,
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  KeyRound,
  Bell,
  Sun,
  Moon,
  User as UserIcon,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
} from "lucide-react";
import type { CurrentUser } from "@/lib/types";
import { useLogout, useNotifications, type AppNotification } from "@/lib/api/hooks";
import { useUIStore, type Section } from "@/stores/ui-store";
import { roleDisplayName } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/use-theme";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DashboardSection } from "@/components/app/sections/dashboard-section";
import { InventorySection } from "@/components/app/sections/inventory-section";
import { SuppliersSection } from "@/components/app/sections/suppliers-section";
import { CategoriesSection } from "@/components/app/sections/categories-section";
import { StoresSection } from "@/components/app/sections/stores-section";
import { ReceiptsSection } from "@/components/app/sections/receipts-section";
import { IssuesSection } from "@/components/app/sections/issues-section";
import { TransfersSection } from "@/components/app/sections/transfers-section";
import { ReportsSection } from "@/components/app/sections/reports-section";
import { AuditLogsSection } from "@/components/app/sections/audit-logs-section";
import { UsersSection } from "@/components/app/sections/users-section";
import { RolesSection } from "@/components/app/sections/roles-section";
import { SettingsSection } from "@/components/app/sections/settings-section";
import { RequisitionsSection } from "@/components/app/sections/requisitions-section";

type NavItem = {
  id: Section;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string | string[];
};

type NavGroup = {
  heading: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
    ],
  },
  {
    heading: "Operations",
    items: [
      { id: "receipts", label: "Stock Receipts", icon: ArrowDownToLine, permission: "inventory.read" },
      { id: "issues", label: "Stock Issues", icon: ArrowUpFromLine, permission: "inventory.read" },
      { id: "transfers", label: "Stock Transfers", icon: ArrowLeftRight, permission: "inventory.read" },
      { id: "requisitions", label: "Requisitions", icon: FileText, permission: "requisition.read" },
    ],
  },
  {
    heading: "Catalog",
    items: [
      { id: "inventory", label: "Inventory", icon: Package, permission: "inventory.read" },
      { id: "suppliers", label: "Suppliers", icon: Truck, permission: "suppliers.read" },
      { id: "categories", label: "Categories", icon: FolderTree, permission: "categories.read" },
      { id: "stores", label: "Stores", icon: WarehouseIcon, permission: "warehouses.read" },
    ],
  },
  {
    heading: "Insights",
    items: [
      { id: "reports", label: "Reports", icon: BarChart3, permission: "reports.view" },
      { id: "audit-logs", label: "Audit Logs", icon: ScrollText, permission: "audit.view" },
    ],
  },
  {
    heading: "Administration",
    items: [
      { id: "users", label: "Users", icon: Users, permission: "users.read" },
      { id: "roles", label: "Roles & Permissions", icon: Shield, permission: "roles.read" },
      { id: "settings", label: "Settings", icon: Settings, permission: undefined },
    ],
  },
];

const GROUP_LABEL: Record<string, string> = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.id, g.heading]))
);

function hasPermission(permissions: Set<string>, roles: Set<string>, req?: string | string[]): boolean {
  if (roles.has("ADMINISTRATOR")) return true;
  if (!req) return true;
  if (Array.isArray(req)) return req.some((p) => permissions.has(p));
  return permissions.has(req);
}

function getUserInitials(fullName: string): string {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "U";
}

export function AppShell({
  user,
  permissions,
  roles,
}: {
  user: CurrentUser;
  permissions: Set<string>;
  roles: Set<string>;
}) {
  const section = useUIStore((s) => s.section);
  const setSection = useUIStore((s) => s.setSection);
  const setSettingsTab = useUIStore((s) => s.setSettingsTab);
  const logout = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock body scroll while mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Close sidebar on resize to md+
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setMobileOpen(false); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const visibleGroups = useMemo(
    () =>
      NAV_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((n) => hasPermission(permissions, roles, n.permission)),
      })).filter((g) => g.items.length > 0),
    [permissions, roles]
  );

  const onLogout = async () => {
    await logout.mutateAsync().catch(() => { });
    window.location.reload();
  };

  const currentNav = visibleGroups.flatMap((g) => g.items).find((n) => n.id === section);
  const userInitials = getUserInitials(user.fullName);
  const primaryRole = user.roles[0] ? roleDisplayName(user.roles[0].name) : "";

  return (
    <div className="min-h-screen flex bg-surface">
      {/* ── Sidebar ── dark rail, fixed on mobile / sticky on md+ */}
      <aside
        className={cn(
          "dark fixed md:sticky top-0 left-0 z-40 h-screen w-[264px] flex flex-col bg-sidebar border-r border-sidebar-border",
          "transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Branding + mobile close button */}
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-inset ring-border">
            <img
              src="/astu-logo.svg"
              alt="Adama Science and Technology University"
              className="h-full w-full object-contain p-0.5"
            />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-semibold text-foreground">Stock Management</p>
            <p className="truncate text-[10.5px] text-muted-foreground">Adama Science &amp; Technology University</p>
          </div>
          {/* Close button — mobile only, 44×44 tap target */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4">
          {visibleGroups.map((group) => (
            <div key={group.heading}>
              <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.heading}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = section === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSection(item.id);
                        setMobileOpen(false);
                      }}
                      /* min 44px tap target on mobile */
                      className={cn(
                        "group relative flex w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors",
                        "min-h-[44px] py-2 md:min-h-0 md:py-2",
                        active
                          ? "bg-surface-2 font-medium text-foreground"
                          : "text-foreground/70 hover:bg-surface-2 hover:text-foreground"
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-[2.5px] -translate-y-1/2 rounded-full bg-primary" />
                      )}
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                      <span className="flex-1 truncate text-left">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer — user info */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 rounded-md bg-surface-2/60 px-2.5 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-semibold text-primary-foreground">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">{user.fullName}</div>
              <div className="text-[10px] text-muted-foreground truncate">{primaryRole}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay — sits below sidebar (z-30 < z-40) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/50 backdrop-blur-[2px] md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-card px-3 sm:px-4">
          {/* Hamburger — 44×44 tap target */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors md:hidden"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px]">
            <span className="hidden text-muted-foreground sm:inline shrink-0">
              {currentNav ? GROUP_LABEL[currentNav.id] : "Overview"}
            </span>
            <ChevronDown className="hidden h-3 w-3 -rotate-90 text-muted-foreground/40 sm:inline shrink-0" />
            <span className="truncate font-medium text-foreground">
              {currentNav?.label ?? "Dashboard"}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationsBell />

            <div className="h-6 w-px bg-border mx-1 hidden md:block" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {/* 44px tap target on mobile — just the avatar circle */}
                <button className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-surface-2 transition-colors md:h-auto md:w-auto md:gap-2 md:pl-1 md:pr-2 md:py-1">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                    {userInitials}
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-xs font-semibold leading-tight">{user.fullName}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">
                      {primaryRole}
                      {user.department ? ` · ${user.department}` : ""}
                    </div>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {userInitials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{user.fullName}</div>
                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {user.roles.map((r) => (
                          <Badge key={r.id} variant="secondary" className="text-[9px]">
                            {roleDisplayName(r.name)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="min-h-[44px] md:min-h-0"
                  onClick={() => {
                    setSection("settings");
                    setSettingsTab("profile");
                  }}
                >
                  <UserIcon className="h-4 w-4 mr-2" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="min-h-[44px] md:min-h-0"
                  onClick={() => {
                    setSection("settings");
                    setSettingsTab("security");
                  }}
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  <span>Change Password</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="min-h-[44px] md:min-h-0 text-danger focus:text-danger"
                  onClick={onLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content — tighter padding on mobile */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
          <div className="max-w-[1400px] mx-auto">
            {section === "dashboard" && <DashboardSection />}
            {section === "inventory" && <InventorySection />}
            {section === "suppliers" && <SuppliersSection />}
            {section === "categories" && <CategoriesSection />}
            {section === "stores" && <StoresSection />}
            {section === "receipts" && <ReceiptsSection />}
            {section === "issues" && <IssuesSection />}
            {section === "transfers" && <TransfersSection />}
            {section === "requisitions" && <RequisitionsSection />}
            {section === "reports" && <ReportsSection />}
            {section === "audit-logs" && <AuditLogsSection />}
            {section === "users" && <UsersSection />}
            {section === "roles" && <RolesSection />}
            {section === "settings" && <SettingsSection />}
          </div>
        </div>
      </main>
    </div>
  );
}

// ---------------- Theme Toggle ----------------

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      onClick={toggle}
      className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground md:h-9 md:w-9"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle color theme"
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}

// ---------------- Notifications Bell ----------------

const NOTIF_STYLES: Record<string, { wrap: string; icon: React.ReactNode }> = {
  danger: {
    wrap: "bg-danger-subtle text-danger-strong ring-danger/25",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  warning: {
    wrap: "bg-warning-subtle text-warning-strong ring-warning/30",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  info: {
    wrap: "bg-info-subtle text-info-strong ring-info/25",
    icon: <Info className="h-3.5 w-3.5" />,
  },
  success: {
    wrap: "bg-success-subtle text-success-strong ring-success/25",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
};

function NotificationsBell() {
  const { data, isLoading } = useNotifications();
  const setSection = useUIStore((s) => s.setSection);
  const setSelectedItemId = useUIStore((s) => s.setSelectedItemId);
  const setNotificationTarget = useUIStore((s) => s.setNotificationTarget);
  const [open, setOpen] = useState(false);

  const unreadCount = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  const handleClick = (n: AppNotification) => {
    if (n.link) {
      setSection(n.link.section as Section);
      setNotificationTarget(n.link.filter ?? null);
      if (n.link.itemId) setSelectedItemId(n.link.itemId);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative h-11 w-11 rounded-md hover:bg-surface-2 flex items-center justify-center transition-colors md:h-9 md:w-9"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px] text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-danger text-danger-foreground text-[9px] font-bold flex items-center justify-center ring-2 ring-card">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-surface/60">
          <div className="flex items-center gap-2">
            <Bell className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <Badge className="text-[9px] bg-danger hover:bg-danger text-danger-foreground">{unreadCount} new</Badge>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">{items.length} total</span>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">Loading notifications...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto text-success mb-2" />
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-[10px] text-muted-foreground mt-1">No active alerts for your role</p>
            </div>
          ) : (
            items.map((n) => {
              const style = NOTIF_STYLES[n.severity] ?? NOTIF_STYLES.info;
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className="w-full flex items-start gap-2.5 px-3 py-2.5 border-b border-border last:border-0 hover:bg-surface-2 transition-colors text-left"
                >
                  <div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0 ring-1 ring-inset", style.wrap)}>
                    {style.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                  {n.severity === "danger" && (
                    <span className="h-2 w-2 rounded-full bg-danger shrink-0 mt-1" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border bg-surface/60 p-2 text-center">
            <button
              onClick={() => {
                setSection("audit-logs");
                setOpen(false);
              }}
              className="text-[11px] font-medium text-link hover:text-link-hover"
            >
              View Audit Logs →
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
