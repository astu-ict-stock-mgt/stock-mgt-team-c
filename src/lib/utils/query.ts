import { NextRequest } from "next/server";
import { z } from "zod";
import { Errors } from "@/lib/utils/errors";

export function qp(req: NextRequest, key: string, fallback?: string): string | undefined {
  const v = req.nextUrl.searchParams.get(key);
  return v ?? fallback;
}

export function qpInt(req: NextRequest, key: string, fallback: number): number {
  const v = req.nextUrl.searchParams.get(key);
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function qpFloat(req: NextRequest, key: string, fallback: number): number {
  const v = req.nextUrl.searchParams.get(key);
  if (!v) return fallback;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

export function qpBool(req: NextRequest, key: string, fallback = false): boolean {
  const v = req.nextUrl.searchParams.get(key);
  if (!v) return fallback;
  return v === "true" || v === "1" || v === "yes";
}

export async function parseBody<T>(req: NextRequest, schema: z.ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw Errors.validation("Invalid JSON body");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw Errors.validation("Validation failed", parsed.error.flatten());
  }
  return parsed.data;
}
