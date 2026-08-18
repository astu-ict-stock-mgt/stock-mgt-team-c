// Centralized API client. All fetch() calls go through this.
// Frontend never directly touches Prisma — only this client + TanStack Query hooks.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

const TOKEN_KEY = "sms.token";
const REFRESH_KEY = "sms.refresh";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
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

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
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
  const body = (await res.json()) as ApiResponse<T>;
  if (!body.success) {
    // Auto-clear token on auth errors
    if (res.status === 401) clearToken();
    throw new ApiClientError(res.status, body.error.code, body.message, body.error.details);
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
