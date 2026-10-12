import { createMiddleware } from "hono/factory";
import type { AppEnv, Tenant } from "../context";
import { forbidden, unauthenticated } from "../errors";
import type { TenancyService } from "../tenancy/service";

type TenantLookup = Pick<TenancyService, "findMembership">;

async function resolveTenant(
  tenancy: TenantLookup,
  userId: string,
  organizationId: string | null | undefined,
): Promise<Tenant | null> {
  if (!organizationId) return null;
  const membership = await tenancy.findMembership(organizationId, userId);
  return membership ? { organizationId, ...membership } : null;
}

/**
 * Resolves the session's active organization, verifies membership and sets `tenant`.
 * Responds 403 when there is no active organization or the user is not a member.
 */
export function tenant(tenancy: TenantLookup) {
  return createMiddleware<AppEnv & { Variables: { tenant: Tenant } }>(async (c, next) => {
    const user = c.get("user");
    if (!user) throw unauthenticated();
    const resolved = await resolveTenant(tenancy, user.id, c.get("session")?.activeOrganizationId);
    if (!resolved) throw forbidden("Select an organization you belong to.");
    c.set("tenant", resolved);
    await next();
  });
}

/** Like `tenant`, but continues without `tenant` instead of failing. */
export function optionalTenant(tenancy: TenantLookup) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user");
    if (!user) throw unauthenticated();
    const resolved = await resolveTenant(tenancy, user.id, c.get("session")?.activeOrganizationId);
    if (resolved) c.set("tenant", resolved);
    await next();
  });
}
