import type { Me } from "@starter/contracts";
import { Hono } from "hono";
import type { AppEnv } from "../../core/context";
import { ok } from "../../core/http";
import { optionalTenant, requireAuth, session } from "../../core/middleware";
import { toPlatformRole } from "../../core/tenancy";
import type { AppDeps } from "../../deps";

/** Current user and active organization. A user without one gets `organization: null`. */
export function createMeRouter({ auth, env, tenancy }: Pick<AppDeps, "auth" | "env" | "tenancy">) {
  return new Hono<AppEnv>()
    .use(session(auth))
    .use(requireAuth)
    .use(optionalTenant(tenancy))
    .get("/", (c) => {
      const user = c.get("user");
      const tenant = c.get("tenant");
      const me: Me = {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image ?? null,
          role: toPlatformRole(user.role),
        },
        organization: tenant?.organization ?? null,
        role: tenant?.role ?? null,
        tenancyMode: env.TENANCY_MODE,
      };
      return ok(c, me);
    });
}
