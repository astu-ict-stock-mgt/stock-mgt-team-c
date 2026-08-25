import { Prisma } from "@prisma/client";

/**
 * Sequential document numbers (GRN-20260825-0001, ISS-…, TRF-…, TXN-…, REQ-…).
 *
 * The count that produces the sequence number MUST run inside the same
 * transaction as the insert, otherwise two requests read the same count and
 * build the same code. Even inside a transaction two concurrent transactions can
 * still collide on the unique index, so callers wrap the whole operation in
 * withUniqueRetry() and simply try again with a fresh count.
 */

export function utcDateStamp(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/**
 * Builds the next code for today's date scope.
 * `countWithin` must count existing rows whose code starts with the given prefix,
 * using the transaction client.
 */
export async function nextDocumentCode(
  prefix: string,
  countWithin: (startsWith: string) => Promise<number>
): Promise<string> {
  const scope = `${prefix}-${utcDateStamp()}-`;
  const used = await countWithin(scope);
  return `${scope}${String(used + 1).padStart(4, "0")}`;
}

const UNIQUE_VIOLATION = "P2002";

/**
 * Retries an operation that can lose a race on a unique index. Only P2002 is
 * retried; every other error propagates untouched.
 */
export async function withUniqueRetry<T>(operation: () => Promise<T>, attempts = 5): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      const code = (err as Prisma.PrismaClientKnownRequestError)?.code;
      if (code !== UNIQUE_VIOLATION) throw err;
      lastError = err;
    }
  }
  throw lastError;
}
