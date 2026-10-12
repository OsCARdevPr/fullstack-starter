import type { PlatformRole } from "@starter/contracts";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../context";
import { forbidden, unauthenticated } from "../errors";
import { splitRoles } from "../tenancy/roles";

/** Requires one of the given platform roles (Better Auth `admin` plugin `user.role`). */
export function requirePlatformRole(...roles: PlatformRole[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user");
    if (!user) throw unauthenticated();
    const userRoles = splitRoles(user.role);
    if (!roles.some((role) => userRoles.includes(role))) throw forbidden();
    await next();
  });
}
