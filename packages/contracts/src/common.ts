import { z } from "zod";

/** Primary key of tables owned by this app. Better Auth entities use plain string ids instead. */
export const idSchema = z.uuid();

/** ISO 8601 date-time as produced by `Date#toISOString`; explicit offsets are also accepted. */
export const isoDateTimeSchema = z.iso.datetime({ offset: true });

/** String that is trimmed before its length bounds are checked. */
export function trimmedString(min: number, max: number) {
  return z.string().trim().min(min).max(max);
}

export const sortOrderSchema = z.enum(["asc", "desc"]);

export type SortOrder = z.infer<typeof sortOrderSchema>;

export const searchQuerySchema = z.object({
  // A blank term means "no search" so `?q=` behaves like an absent parameter.
  q: z
    .string()
    .trim()
    .max(100)
    .transform((value) => (value === "" ? undefined : value))
    .optional(),
});

export type SearchQuery = z.output<typeof searchQuerySchema>;
