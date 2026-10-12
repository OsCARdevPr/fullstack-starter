import { z } from "zod";
import { dataEnvelope } from "../http";

/** `single`: every user belongs to one default organization. `multi`: users create and join many. */
export const tenancyModeSchema = z.enum(["single", "multi"]);

export type TenancyMode = z.infer<typeof tenancyModeSchema>;

/** Platform-wide roles (Better Auth `admin` plugin). */
export const platformRoleSchema = z.enum(["admin", "user"]);

export type PlatformRole = z.infer<typeof platformRoleSchema>;

/** Organization member roles (Better Auth `organization` plugin), highest privilege first. */
export const organizationRoleSchema = z.enum(["owner", "admin", "member"]);

export type OrganizationRole = z.infer<typeof organizationRoleSchema>;

export const meUserSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: z.email(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  role: platformRoleSchema,
});

export type MeUser = z.infer<typeof meUserSchema>;

export const organizationSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  slug: z.string(),
});

export type OrganizationSummary = z.infer<typeof organizationSummarySchema>;

/** Current user plus the active organization. `organization` and `role` are null without one. */
export const meSchema = z.object({
  user: meUserSchema,
  organization: organizationSummarySchema.nullable(),
  role: organizationRoleSchema.nullable(),
  tenancyMode: tenancyModeSchema,
});

export type Me = z.infer<typeof meSchema>;

export const meResponseSchema = dataEnvelope(meSchema);
