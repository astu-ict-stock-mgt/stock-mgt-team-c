// Standardized API response helpers.
// All API routes return { success, message, data } or { success: false, message, error: { code, details? } }.

export type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
};

export type ApiError = {
  success: false;
  message: string;
  error: {
    code: string;
    details?: unknown;
  };
};

export function ok<T>(data: T, message = "OK"): ApiSuccess<T> {
  return { success: true, message, data };
}

export function fail(
  code: string,
  message: string,
  details?: unknown
): ApiError {
  return {
    success: false,
    message,
    error: { code, details },
  };
}

// Standard pagination response shape.
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

import { NextResponse } from "next/server";

export function okResponse<T>(data: T, message = "OK", status = 200) {
  return NextResponse.json<ApiSuccess<T>>(ok(data, message), { status });
}

export function errorResponse(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json<ApiError>(fail(code, message, details), { status });
}
