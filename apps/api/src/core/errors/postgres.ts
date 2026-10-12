import type { ErrorCode } from "@starter/contracts";

const MAX_CAUSE_DEPTH = 10;

/** SQLSTATE codes that describe client mistakes rather than server faults. */
const POSTGRES_ERRORS: Record<string, { code: ErrorCode; message: string }> = {
  "23505": { code: "CONFLICT", message: "A record with the same unique value already exists." },
  "23503": {
    code: "CONFLICT",
    message: "The operation references a record that does not exist or is still referenced.",
  },
  "22P02": { code: "BAD_REQUEST", message: "A value has an invalid format." },
};

/**
 * Finds a mapped Postgres error on the error itself or anywhere in its `cause` chain.
 * Drizzle wraps driver errors in a DrizzleQueryError whose `cause` is the postgres.js error.
 */
export function findPostgresError(error: unknown): { code: ErrorCode; message: string } | null {
  const seen = new Set<unknown>();
  let current: unknown = error;

  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current && !seen.has(current); depth += 1) {
    seen.add(current);
    if (typeof current !== "object") return null;
    const sqlState = (current as { code?: unknown }).code;
    if (typeof sqlState === "string" && POSTGRES_ERRORS[sqlState]) return POSTGRES_ERRORS[sqlState];
    current = (current as { cause?: unknown }).cause;
  }

  return null;
}
