import { Request } from "express";

export const MAX_PAGE_SIZE = 100;

export function qp(req: Request, key: string, fallback?: string): string | undefined {
  const v = req.query[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v.length > 0) return String(v[0]);
  return fallback;
}

export function qpInt(req: Request, key: string, fallback: number): number {
  const v = req.query[key];
  if (typeof v !== "string" || !v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

// Pagination params must never reach Prisma unchecked: a negative `take`
// silently reverses the result set and `page: 0` produces a negative `skip`,
// which throws. Clamp both here so every route gets the same guarantees.
export function qpPage(req: Request, fallback = 1): number {
  const n = qpInt(req, "page", fallback);
  return n < 1 ? 1 : n;
}

export function qpLimit(req: Request, fallback = 20, max = MAX_PAGE_SIZE): number {
  const n = qpInt(req, "limit", fallback);
  if (n < 1) return 1;
  return n > max ? max : n;
}
