import {
  type OrganizationRole,
  organizationRoleSchema,
  type PlatformRole,
  platformRoleSchema,
} from "@starter/contracts";

/** Splits a stored role value; Better Auth stores multiple roles as a comma-separated list. */
export function splitRoles(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

/** Highest-privilege known organization role in a stored value, or null when none is known. */
export function toOrganizationRole(value: string | null | undefined): OrganizationRole | null {
  const roles = new Set(splitRoles(value));
  return organizationRoleSchema.options.find((role) => roles.has(role)) ?? null;
}

/** Platform role used by the API contract; anything other than admin is a regular user. */
export function toPlatformRole(value: string | null | undefined): PlatformRole {
  return splitRoles(value).includes(platformRoleSchema.enum.admin) ? "admin" : "user";
}
