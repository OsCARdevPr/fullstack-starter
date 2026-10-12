import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Use at least 2 characters.")
    .max(120, "Use at most 120 characters."),
});

export type CreateOrganizationValues = z.output<typeof createOrganizationSchema>;

/**
 * URL-safe slug for a new organization: the name in kebab case plus a short random suffix,
 * because slugs are unique across all organizations ("Acme Inc." -> "acme-inc-3f9a1c").
 */
export function organizationSlug(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = crypto.randomUUID().slice(0, 6);
  return base ? `${base}-${suffix}` : suffix;
}
