// Standardized API response helpers.

export type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
};

export type ApiError = {
  success: false;
  message: string;
  error: { code: string; details?: unknown };
};

export function ok<T>(data: T, message = "OK"): ApiSuccess<T> {
  return { success: true, message, data };
}

export function fail(code: string, message: string, details?: unknown): ApiError {
  return { success: false, message, error: { code, details } };
}

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export function paginate<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
