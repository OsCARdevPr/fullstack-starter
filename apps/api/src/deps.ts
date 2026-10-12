import type { Env } from "./config/env";
import type { RateLimitStore } from "./core/middleware/rate-limit-store";
import type { TenancyService } from "./core/tenancy/service";
import type { Database } from "./db/client";
import type { AppAuth } from "./lib/auth";
import type { Logger } from "./lib/logger";

/** Everything the HTTP app needs. Built in `index.ts`; tests pass fakes. */
export interface AppDeps {
  env: Env;
  db: Database;
  auth: AppAuth;
  logger: Logger;
  tenancy: TenancyService;
  /** Defaults to an in-memory store; pass a shared store when running several instances. */
  rateLimitStore?: RateLimitStore;
}
