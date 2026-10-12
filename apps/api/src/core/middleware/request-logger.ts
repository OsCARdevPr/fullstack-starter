import type { MiddlewareHandler } from "hono";
import type { Logger } from "../../lib/logger";
import type { AppEnv } from "../context";

/** Attaches a child logger bound to the request id and logs one line per completed request. */
export function requestLogger(logger: Logger): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const startedAt = performance.now();
    const log = logger.child({ requestId: c.get("requestId") });
    c.set("logger", log);

    await next();

    log.info(
      {
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      },
      "request completed",
    );
  };
}
