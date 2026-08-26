// Centralized API client. All fetch() calls go through this.
// Frontend never directly touches Prisma — only this client + TanStack Query hooks.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

const TOKEN_KEY = "sms.token";
const REFRESH_KEY = "sms.refresh";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setToken(token: string | null, refresh?: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  if (refresh !== undefined) {
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    else localStorage.removeItem(REFRESH_KEY);
  }
}

export function clearToken() {
  setToken(null, null);
}

export type ApiError = {
  success: false;
  message: string;
  error: { code: string; details?: unknown };
};

export type ApiResponse<T> = { success: true; message: string; data: T } | ApiError;

const REFRESH_PATH = "/api/v1/auth/refresh";

// One refresh at a time. Without this, a page that fires six queries on mount
// would send six refresh calls; token rotation means only the first could win
// and the other five would log the user out.
let inFlightRefresh: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  const res = await fetch(`${API_BASE_URL}${REFRESH_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ refresh }),
  }).catch(() => null);

  if (!res || !res.ok) return false;
  const body = (await res.json().catch(() => null)) as ApiResponse<{ token: string; refresh: string }> | null;
  if (!body?.success) return false;

  setToken(body.data.token, body.data.refresh);
  return true;
}

function refreshOnce(): Promise<boolean> {
  inFlightRefresh ??= refreshAccessToken().finally(() => { inFlightRefresh = null; });
  return inFlightRefresh;
}

async function request<T>(path: string, init: RequestInit): Promise<{ status: number; body: ApiResponse<T> }> {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");

  const url = path.startsWith("http://") || path.startsWith("https://") ? path : `${API_BASE_URL}${path}`;
  const res = await fetch(url, { ...init, headers });
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    throw new ApiClientError(res.status, "INTERNAL_ERROR", `Unexpected non-JSON response (status ${res.status})`);
  }
  return { status: res.status, body: (await res.json()) as ApiResponse<T> };
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  let { status, body } = await request<T>(path, init);

  // A 12-hour access token used to mean a silent logout mid-session. Spend the
  // stored refresh token on the first 401 and replay the original request; only
  // give up — and clear the session — if that fails too.
  const canRetry = status === 401 && path !== REFRESH_PATH && !!getRefreshToken();
  if (canRetry && (await refreshOnce())) {
    ({ status, body } = await request<T>(path, init));
  }

  if (!body.success) {
    if (status === 401) clearToken();
    throw new ApiClientError(status, body.error.code, body.message, body.error.details);
  }
  return body.data;
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

// Convenience HTTP method helpers.
export const apiClient = {
  get: <T = unknown>(path: string) => api<T>(path),
  post: <T = unknown>(path: string, body?: unknown) =>
    api<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T = unknown>(path: string, body?: unknown) =>
    api<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T = unknown>(path: string) => api<T>(path, { method: "DELETE" }),
};
