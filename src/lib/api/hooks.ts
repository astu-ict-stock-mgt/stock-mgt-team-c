"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, setToken, clearToken, getToken } from "@/lib/api/client";
import type {
  AuthSession,
  CurrentUser,
  Paginated,
  Supplier,
  Category,
  Store,
  Uom,
  InventoryItem,
  InventoryItemDetail,
  Receipt,
  ReceiptDetail,
  Issue,
  IssueDetail,
  Requisition,
  AuditLog,
  DashboardStats,
  InventoryReport,
  ValuationReport,
  MovementReportItem,
  Role,
} from "@/lib/types";

// ---------------- Auth ----------------
export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      apiClient.post<AuthSession>("/api/v1/auth/login", body),
    onSuccess: (data) => {
      setToken(data.token, data.refresh);
      qc.setQueryData(["auth", "me"], {
        user: data.user,
        permissions: data.user.roles.flatMap((r) => r.permissions),
        roles: data.user.roles.map((r) => r.name),
      });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post("/api/v1/auth/logout", { token: getToken() }),
    onSettled: () => {
      clearToken();
      qc.clear();
    },
  });
}

export function useMe() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      if (!getToken()) return null;
      return apiClient.get<{ user: CurrentUser; permissions: string[]; roles: string[] }>(
        "/api/v1/auth/me"
      );
    },
    retry: false,
    staleTime: 60_000,
  });
}

// ---------------- Users ----------------
export function useUsers(params: { page: number; limit: number; search?: string; status?: string; roleId?: string }) {
  const search = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.search) search.set("search", params.search);
  if (params.status) search.set("status", params.status);
  if (params.roleId) search.set("roleId", params.roleId);
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => apiClient.get<Paginated<{ id: string; email: string; username: string; fullName: string; status: string; department: string | null; phoneNumber: string | null; lastLoginAt: string | null; roles: { id: string; name: string }[] }>>(`/api/v1/users?${search}`),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; username: string; fullName: string; password: string; department?: string; phoneNumber?: string; roleIds: string[] }) =>
      apiClient.post("/api/v1/users", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

// ---------------- Roles ----------------
export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => apiClient.get<{ items: Role[] }>("/api/v1/roles"),
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; description?: string; permissionIds?: string[] }) =>
      apiClient.post<Role>("/api/v1/roles", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; description?: string | null }) =>
      apiClient.patch<Role>(`/api/v1/roles/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/roles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}

export function useTogglePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, permission, enable }: { roleId: string; permission: string; enable: boolean }) =>
      apiClient.patch<Role>(`/api/v1/roles/${roleId}/permissions`, { permission, enable }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}

// ---------------- Auth profile ----------------
export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      apiClient.post<{ changed: boolean }>("/api/v1/auth/change-password", body),
  });
}

// ---------------- Notifications ----------------
export type AppNotification = {
  id: string;
  type: "low_stock" | "out_of_stock" | "pending_requisition" | "pending_gate_pass" | "pending_stocktake" | "failed_login" | "below_safety" | "info";
  title: string;
  message: string;
  severity: "info" | "warning" | "danger" | "success";
  link?: { section: string; itemId?: string };
  createdAt: string;
};

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiClient.get<{ items: AppNotification[]; unreadCount: number }>("/api/v1/notifications"),
    refetchInterval: 60_000, // refresh every minute
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { fullName?: string; department?: string | null; phoneNumber?: string | null }) =>
      apiClient.patch<{ user: CurrentUser }>("/api/v1/auth/profile", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

// ---------------- Suppliers ----------------
export function useSuppliers(params: { page: number; limit: number; search?: string; status?: string }) {
  const search = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.search) search.set("search", params.search);
  if (params.status) search.set("status", params.status);
  return useQuery({
    queryKey: ["suppliers", params],
    queryFn: () => apiClient.get<Paginated<Supplier>>(`/api/v1/suppliers?${search}`),
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; contactPerson?: string; email?: string; phone?: string; address?: string; status?: "ACTIVE" | "INACTIVE" | "BLACKLISTED" }) =>
      apiClient.post("/api/v1/suppliers", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; contactPerson?: string | null; email?: string | null; phone?: string | null; address?: string | null; status?: "ACTIVE" | "INACTIVE" | "BLACKLISTED" }) =>
      apiClient.patch(`/api/v1/suppliers/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

// ---------------- Categories & Stores ----------------
export function useCategoriesAndUoms() {
  return useQuery({
    queryKey: ["categories-uoms"],
    queryFn: () => apiClient.get<{ categories: Category[]; uoms: Uom[] }>("/api/v1/categories"),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { code: string; name: string; description?: string; parentId?: string }) =>
      apiClient.post("/api/v1/categories", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories-uoms"] }),
  });
}

export function useStores() {
  return useQuery({
    queryKey: ["stores"],
    queryFn: () => apiClient.get<{ items: Store[] }>("/api/v1/stores"),
  });
}

export function useCreateStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { code: string; name: string; location?: string }) =>
      apiClient.post("/api/v1/stores", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stores"] }),
  });
}

// ---------------- Inventory ----------------
export function useInventory(params: { page: number; limit: number; search?: string; categoryId?: string; status?: string }) {
  const search = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.search) search.set("search", params.search);
  if (params.categoryId) search.set("categoryId", params.categoryId);
  if (params.status) search.set("status", params.status);
  return useQuery({
    queryKey: ["inventory", params],
    queryFn: () => apiClient.get<Paginated<InventoryItem>>(`/api/v1/inventory?${search}`),
  });
}

export function useInventoryItem(id: string | null) {
  return useQuery({
    queryKey: ["inventory", id],
    queryFn: () => apiClient.get<InventoryItemDetail>(`/api/v1/inventory/${id}`),
    enabled: !!id,
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { code: string; name: string; description?: string; categoryId: string; uomId: string; minStock?: number; maxStock?: number; safetyStock?: number; reorderLevel?: number }) =>
      apiClient.post("/api/v1/inventory", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<{ name: string; description: string | null; categoryId: string; uomId: string; minStock: number; maxStock: number; safetyStock: number; reorderLevel: number; status: string }>) =>
      apiClient.patch(`/api/v1/inventory/${id}`, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory", vars.id] });
    },
  });
}

// ---------------- Receipts ----------------
export function useReceipts(params: { page: number; limit: number; search?: string; supplierId?: string; storeId?: string; status?: string }) {
  const search = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.search) search.set("search", params.search);
  if (params.supplierId) search.set("supplierId", params.supplierId);
  if (params.storeId) search.set("storeId", params.storeId);
  if (params.status) search.set("status", params.status);
  return useQuery({
    queryKey: ["receipts", params],
    queryFn: () => apiClient.get<Paginated<Receipt>>(`/api/v1/receipts?${search}`),
  });
}

export function useReceipt(id: string | null) {
  return useQuery({
    queryKey: ["receipts", id],
    queryFn: () => apiClient.get<ReceiptDetail>(`/api/v1/receipts/${id}`),
    enabled: !!id,
  });
}

export function useCreateReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      supplierId: string;
      storeId: string;
      inspectionNotes?: string;
      items: Array<{ itemId: string; quantity: number; unitCost: number; inspected?: boolean; inspectionPassed?: boolean; remarks?: string }>;
    }) => apiClient.post<ReceiptDetail>("/api/v1/receipts", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receipts"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ---------------- Issues ----------------
export function useIssues(params: { page: number; limit: number; search?: string; storeId?: string; status?: string }) {
  const search = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.search) search.set("search", params.search);
  if (params.storeId) search.set("storeId", params.storeId);
  if (params.status) search.set("status", params.status);
  return useQuery({
    queryKey: ["issues", params],
    queryFn: () => apiClient.get<Paginated<Issue>>(`/api/v1/issues?${search}`),
  });
}

export function useIssue(id: string | null) {
  return useQuery({
    queryKey: ["issues", id],
    queryFn: () => apiClient.get<IssueDetail>(`/api/v1/issues/${id}`),
    enabled: !!id,
  });
}

export function useCreateIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      sourceStoreId: string;
      destStoreId?: string;
      department: string;
      notes?: string;
      items: Array<{ itemId: string; quantity: number; remarks?: string }>;
    }) => apiClient.post<IssueDetail>("/api/v1/issues", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issues"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ---------------- Requisitions ----------------
export function useRequisitions(params: { page: number; limit: number; search?: string; status?: string; department?: string }) {
  const search = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.search) search.set("search", params.search);
  if (params.status) search.set("status", params.status);
  if (params.department) search.set("department", params.department);
  return useQuery({
    queryKey: ["requisitions", params],
    queryFn: () => apiClient.get<Paginated<Requisition>>(`/api/v1/requisitions?${search}`),
  });
}

export function useCreateRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { department: string; requiredDate?: string; notes?: string; items: Array<{ itemId: string; quantity: number }> }) =>
      apiClient.post<Requisition>("/api/v1/requisitions", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useSubmitRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post<Requisition>(`/api/v1/requisitions/${id}/submit`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDecisionRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, comments }: { id: string; decision: "APPROVED" | "REJECTED"; comments?: string }) =>
      apiClient.post<Requisition>(`/api/v1/requisitions/${id}/decision`, { decision, comments }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// ---------------- Dashboard ----------------
export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiClient.get<DashboardStats>("/api/v1/dashboard"),
  });
}

// ---------------- Audit logs ----------------
export function useAuditLogs(params: { page: number; limit: number; search?: string; module?: string; action?: string; userId?: string }) {
  const search = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.search) search.set("search", params.search);
  if (params.module) search.set("module", params.module);
  if (params.action) search.set("action", params.action);
  if (params.userId) search.set("userId", params.userId);
  return useQuery({
    queryKey: ["audit-logs", params],
    queryFn: () => apiClient.get<Paginated<AuditLog>>(`/api/v1/audit-logs?${search}`),
  });
}

// ---------------- Reports ----------------
export function useInventoryReport(params: { categoryId?: string; storeId?: string; lowStockOnly?: boolean }) {
  const search = new URLSearchParams();
  if (params.categoryId) search.set("categoryId", params.categoryId);
  if (params.storeId) search.set("storeId", params.storeId);
  if (params.lowStockOnly) search.set("lowStockOnly", "true");
  return useQuery({
    queryKey: ["reports", "inventory", params],
    queryFn: () => apiClient.get<InventoryReport>(`/api/v1/reports/inventory?${search}`),
  });
}

export function useValuationReport(params: { categoryId?: string; storeId?: string }) {
  const search = new URLSearchParams();
  if (params.categoryId) search.set("categoryId", params.categoryId);
  if (params.storeId) search.set("storeId", params.storeId);
  return useQuery({
    queryKey: ["reports", "valuation", params],
    queryFn: () => apiClient.get<ValuationReport>(`/api/v1/reports/valuation?${search}`),
  });
}

export function useMovementReport(params: { page: number; limit: number; startDate?: string; endDate?: string; storeId?: string; itemId?: string; type?: string; userId?: string }) {
  const search = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.startDate) search.set("startDate", params.startDate);
  if (params.endDate) search.set("endDate", params.endDate);
  if (params.storeId) search.set("storeId", params.storeId);
  if (params.itemId) search.set("itemId", params.itemId);
  if (params.type) search.set("type", params.type);
  if (params.userId) search.set("userId", params.userId);
  return useQuery({
    queryKey: ["reports", "movement", params],
    queryFn: () => apiClient.get<Paginated<MovementReportItem>>(`/api/v1/reports/movement?${search}`),
  });
}
