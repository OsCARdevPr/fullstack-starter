import { buildPaginationMeta } from "@starter/contracts";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/** Success envelope: `{ data }`. */
export function ok<T, S extends ContentfulStatusCode = 200>(c: Context, data: T, status?: S) {
  return c.json({ data }, status ?? (200 as S));
}

/** Paginated envelope: `{ data, meta }`, with `totalPages` derived from the totals. */
export function paginated<T>(
  c: Context,
  items: T[],
  totals: { page: number; pageSize: number; total: number },
) {
  return c.json({ data: items, meta: buildPaginationMeta(totals) }, 200);
}
