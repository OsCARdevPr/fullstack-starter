import { Hono } from "hono";
import { requestId } from "hono/request-id";
import type { AppEnv } from "./core/context";
import { createErrorHandler, notFoundHandler } from "./core/errors";
import {
  apiCors,
  limitBody,
  MemoryRateLimitStore,
  rateLimit,
  requestLogger,
  resolveClientIp,
  securityHeaders,
} from "./core/middleware";
import type { AppDeps } from "./deps";
import { createAuthRouter } from "./modules/auth";
import { createHealthRouter } from "./modules/health";
import { createMeRouter } from "./modules/me";

export type { AppDeps } from "./deps";

export function createApp(deps: AppDeps) {
  const { env, logger } = deps;
  const app = new Hono<AppEnv>();

  app.use(requestId());
  app.use(requestLogger(logger));
  app.use(securityHeaders());
  app.use("/api/*", apiCors(env.WEB_ORIGIN));
  app.use(
    "/api/*",
    rateLimit({
      store: deps.rateLimitStore ?? new MemoryRateLimitStore(),
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      keyGenerator: (c) => resolveClientIp(c, { trustProxy: env.TRUST_PROXY }) ?? "unknown",
    }),
  );
  app.use("/api/*", limitBody(env.BODY_LIMIT_BYTES));

  app.onError(createErrorHandler({ isDevelopment: env.NODE_ENV === "development", logger }));
  app.notFound(notFoundHandler);

  // Chained so AppType carries every route for the typed RPC client.
  return app
    .route("/api/health", createHealthRouter(deps))
    .route("/api/auth", createAuthRouter(deps))
    .route("/api/me", createMeRouter(deps));
}

/** Route types for `hc<AppType>()` in the web app. Import as a type only. */
export type AppType = ReturnType<typeof createApp>;
