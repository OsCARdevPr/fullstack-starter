import { createMiddleware } from "hono/factory";
import type { AppEnv, AuthSession, AuthUser } from "../context";
import { unauthenticated } from "../errors";

/** Rejects anonymous requests with 401 and narrows `user` and `session` for later handlers. */
export const requireAuth = createMiddleware<
  AppEnv & { Variables: { user: AuthUser; session: AuthSession } }
>(async (c, next) => {
  if (!c.get("user") || !c.get("session")) throw unauthenticated();
  await next();
});
