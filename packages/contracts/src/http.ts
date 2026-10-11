import { z } from "zod";

export const PAGINATION = {
  defaultPage: 1,
  defaultPageSize: 20,
  maxPageSize: 100,
} as const;

/** Pagination query parameters. Values are coerced because they arrive as query strings. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.defaultPage),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.maxPageSize)
    .default(PAGINATION.defaultPageSize),
});

export type PaginationQueryInput = z.input<typeof paginationQuerySchema>;
export type PaginationQuery = z.output<typeof paginationQuerySchema>;

export const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

/** Success body: `{ data: T }`. */
export function dataEnvelope<T extends z.ZodType>(schema: T) {
  return z.object({ data: schema });
}

/** Paginated success body: `{ data: T[], meta }`. */
export function paginatedEnvelope<T extends z.ZodType>(itemSchema: T) {
  return z.object({ data: z.array(itemSchema), meta: paginationMetaSchema });
}

export type DataEnvelope<T> = { data: T };
export type PaginatedEnvelope<T> = { data: T[]; meta: PaginationMeta };

/**
 * Builds pagination metadata. An empty result set has `totalPages: 0`,
 * so clients can distinguish "no results" from "one page of results".
 */
export function buildPaginationMeta({
  total,
  page,
  pageSize,
}: {
  total: number;
  page: number;
  pageSize: number;
}): PaginationMeta {
  if (pageSize < 1) throw new RangeError(`pageSize must be >= 1, received ${pageSize}`);
  if (total < 0) throw new RangeError(`total must be >= 0, received ${total}`);
  return { page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

/** Converts a 1-based page into a SQL row offset. */
export function toOffset({ page, pageSize }: Pick<PaginationQuery, "page" | "pageSize">): number {
  return (page - 1) * pageSize;
}
