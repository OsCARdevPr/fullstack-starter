import { Hono } from "hono";
import { requestId } from "hono/request-id";
import type { AppEnv } from "../core/context";
import { createErrorHandler, notFoundHandler } from "../core/errors";
import { requestLogger } from "../core/middleware";
import { createLogger, type Logger } from "../lib/logger";

/** Minimal app with the global error plumbing, for testing middleware and helpers in isolation. */
export function createBareApp(
  options: { logger?: Logger; isDevelopment?: boolean } = {},
): Hono<AppEnv> {
  const logger = options.logger ?? createLogger({ level: "silent", pretty: false });
  const app = new Hono<AppEnv>();
  app.use(requestId());
  app.use(requestLogger(logger));
  app.onError(createErrorHandler({ isDevelopment: options.isDevelopment ?? false }));
  app.notFound(notFoundHandler);
  return app;
}
