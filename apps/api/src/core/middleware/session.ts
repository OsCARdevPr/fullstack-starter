import { createMiddleware } from "hono/factory";
import type { AppAuth } from "../../lib/auth";
import type { AppEnv } from "../context";

/**
 * Loads the Better Auth session into `user` and `session`. Anonymous requests continue without
 * them; pair with `requireAuth` to reject them. Mount on protected routers, not globally.
 */
export function session(auth: AppAuth) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const result = await auth.api.getSession({ headers: c.req.raw.headers });
    if (result) {
      c.set("user", result.user);
      c.set("session", result.session);
    }
    await next();
  });
}
