import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context } from "hono";

/**
 * Client address for rate limiting and auditing. With `trustProxy`, exactly one proxy hop is
 * trusted: the rightmost X-Forwarded-For entry, which that proxy appended. Otherwise the socket
 * address is used and forwarded headers are ignored, because clients can forge them.
 */
export function resolveClientIp(c: Context, options: { trustProxy: boolean }): string | null {
  if (options.trustProxy) {
    const forwarded = c.req.header("x-forwarded-for");
    const lastHop = forwarded
      ?.split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .at(-1);
    if (lastHop) return lastHop;
  }

  try {
    return getConnInfo(c).remote.address ?? null;
  } catch {
    // No Node socket bindings (for example `app.request()` in tests).
    return null;
  }
}
