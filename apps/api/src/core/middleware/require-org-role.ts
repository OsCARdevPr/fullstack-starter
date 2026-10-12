import type { OrganizationRole } from "@starter/contracts";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../context";
import { forbidden } from "../errors";

/** Requires one of the given roles in the active organization. Mount after `tenant`. */
export function requireOrgRole(...roles: OrganizationRole[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const role = c.get("tenant")?.role;
    if (!role || !roles.includes(role)) throw forbidden();
    await next();
  });
}
