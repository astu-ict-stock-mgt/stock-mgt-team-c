import { Request } from "express";

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
