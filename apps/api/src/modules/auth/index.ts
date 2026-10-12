import { Hono } from "hono";
import type { AppEnv } from "../../core/context";
import { resolveClientIp } from "../../core/middleware";
import type { AppDeps } from "../../deps";

/**
 * Mounts Better Auth on /api/auth/*. Its responses keep Better Auth's own error shape
 * (`{ code, message }`), which the web auth client understands; they are not app envelopes.
 */
export function createAuthRouter({ auth, env }: Pick<AppDeps, "auth" | "env">) {
  return new Hono<AppEnv>().on(["GET", "POST"], "/*", (c) => {
    // Better Auth rate-limits by the X-Forwarded-For value. Replace it with the address this
    // app trusts so clients cannot rotate a forged header to bypass the limit.
    const headers = new Headers(c.req.raw.headers);
    const clientIp = resolveClientIp(c, { trustProxy: env.TRUST_PROXY });
    if (clientIp) headers.set("x-forwarded-for", clientIp);
    else headers.delete("x-forwarded-for");

    return auth.handler(new Request(c.req.raw, { headers }));
  });
}
