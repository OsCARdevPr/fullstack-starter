import { parseEnv } from "../config/env";
import type { TenancyRepository } from "../core/tenancy/repository";
import { createTenancyService } from "../core/tenancy/service";
import { createDatabase } from "../db/client";
import { createAuth } from "./auth";

/**
 * Entry point for the Better Auth CLI only (`pnpm auth:generate`); the app never imports it.
 * It builds the auth instance with the app's plugins from fixed placeholder settings, so schema
 * generation is deterministic and needs no database or `.env`.
 */
const env = parseEnv({
  NODE_ENV: "development",
  DATABASE_URL: "postgres://localhost:5432/better_auth_cli",
  BETTER_AUTH_SECRET: "dev-only-better-auth-cli-placeholder-secret",
  BETTER_AUTH_URL: "http://localhost:3000",
  WEB_ORIGIN: "http://localhost:5173",
});

const { db } = createDatabase(env.DATABASE_URL, { max: 1 });

// Database hooks never run during schema generation, so the tenancy repository is not needed.
const tenancy = createTenancyService({
  repository: {} as TenancyRepository,
  mode: env.TENANCY_MODE,
  defaultOrganization: { name: env.DEFAULT_ORG_NAME, slug: env.DEFAULT_ORG_SLUG },
});

export const auth = createAuth({ env, db, tenancy });
