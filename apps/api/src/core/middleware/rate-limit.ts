import type { Context, MiddlewareHandler } from "hono";
import { rateLimited } from "../errors";
import type { RateLimitStore } from "./rate-limit-store";

export interface RateLimitOptions {
  store: RateLimitStore;
  windowMs: number;
  /** Requests allowed per key and window. */
  max: number;
  keyGenerator: (c: Context) => string;
  now?: () => number;
}

/** Fixed-window rate limiter. Over the limit it throws RATE_LIMITED and sets Retry-After. */
export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  const now = options.now ?? Date.now;

  return async (c, next) => {
    const { count, resetAt } = await options.store.increment(
      options.keyGenerator(c),
      options.windowMs,
    );
    const resetSeconds = Math.max(1, Math.ceil((resetAt - now()) / 1000));

    c.header("RateLimit-Limit", String(options.max));
    c.header("RateLimit-Remaining", String(Math.max(0, options.max - count)));
    c.header("RateLimit-Reset", String(resetSeconds));

    if (count > options.max) {
      c.header("Retry-After", String(resetSeconds));
      throw rateLimited(resetSeconds);
    }

    await next();
  };
}
