import type { ErrorHandler, NotFoundHandler } from "hono";
import type { Logger } from "../../lib/logger";
import type { AppEnv } from "../context";
import { notFound } from "./app-error";
import { toErrorResponse } from "./to-error-response";

const UNKNOWN_REQUEST_ID = "unknown";

export interface ErrorHandlerOptions {
  isDevelopment: boolean;
  /** Used when the failure happened before the request logger was attached. */
  logger?: Logger;
}

export function createErrorHandler(options: ErrorHandlerOptions): ErrorHandler<AppEnv> {
  return (error, c) => {
    const requestId = c.get("requestId") ?? UNKNOWN_REQUEST_ID;
    const { status, body } = toErrorResponse(error, {
      requestId,
      isDevelopment: options.isDevelopment,
    });

    if (status >= 500) {
      const logger = c.get("logger") ?? options.logger;
      logger?.error({ err: error, code: body.error.code }, "request failed");
    }

    return c.json(body, status);
  };
}

export const notFoundHandler: NotFoundHandler<AppEnv> = (c) => {
  const { status, body } = toErrorResponse(notFound(), {
    requestId: c.get("requestId") ?? UNKNOWN_REQUEST_ID,
    isDevelopment: false,
  });
  return c.json(body, status);
};
