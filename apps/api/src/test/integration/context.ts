import type { OrganizationRole } from "@starter/contracts";
import { createApp } from "../../app";
import type { EnvSource } from "../../config/env";
import { createTenancyRepository, createTenancyService } from "../../core/tenancy";
import { createDatabase, type DatabaseClient } from "../../db/client";
import { createAuth } from "../../lib/auth";
import { createLogger } from "../../lib/logger";
import { buildTestEnv } from "../fakes";

const TEST_PASSWORD = "integration-test-password";

/**
 * Connection string of the throwaway test database. Its name must end in `_test` because the
 * integration run drops and recreates its schema.
 */
export function testDatabaseUrl(): string {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    throw new Error(
      "DATABASE_URL_TEST is not set. Start Postgres with `docker compose -f docker/compose.dev.yaml up -d` " +
        "and run: DATABASE_URL_TEST=postgres://app:app@localhost:5432/app_test pnpm test:integration",
    );
  }
  const name = new URL(url).pathname.slice(1);
  if (!name.endsWith("_test")) {
    throw new Error(
      `DATABASE_URL_TEST must name a database ending in "_test" (got "${name}"): its data is erased.`,
    );
  }
  return url;
}

/** Empties every application table; the migrations bookkeeping lives in another schema. */
export async function truncateAllTables(client: DatabaseClient) {
  const tables = await client<{ name: string }[]>`
    select tablename as name from pg_tables where schemaname = 'public'`;
  if (tables.length === 0) return;
  const list = tables.map(({ name }) => `"public"."${name}"`).join(", ");
  await client.unsafe(`truncate table ${list} restart identity cascade`);
}

/** The real app wired to the test database: real Better Auth, tenancy and repositories. */
export function createIntegrationContext(envOverrides: EnvSource = {}) {
  const env = buildTestEnv({
    DATABASE_URL: testDatabaseUrl(),
    // The general API limiter is covered by unit tests; keep it out of the way here.
    RATE_LIMIT_MAX: "100000",
    ...envOverrides,
  });
  const logger = createLogger({ level: "silent", pretty: false });
  const { client, db } = createDatabase(env.DATABASE_URL, { max: 5 });
  const tenancyRepository = createTenancyRepository(db);
  const tenancy = createTenancyService({
    repository: tenancyRepository,
    mode: env.TENANCY_MODE,
    defaultOrganization: { name: env.DEFAULT_ORG_NAME, slug: env.DEFAULT_ORG_SLUG },
  });
  const auth = createAuth({ env, db, tenancy, logger });
  const app = createApp({ env, db, auth, logger, tenancy });

  /** Session cookie header for an existing user. */
  async function signIn(email: string, password = TEST_PASSWORD) {
    // Server-side API calls skip Better Auth's HTTP rate limit (5 sign-ins per minute per IP).
    const { headers } = await auth.api.signInEmail({
      body: { email, password },
      returnHeaders: true,
    });
    return headers
      .getSetCookie()
      .map((cookie) => cookie.split(";")[0])
      .join("; ");
  }

  /** Creates a user who belongs to `organizationId` with `role`, and signs them in. */
  async function createMember(input: {
    email: string;
    organizationId: string;
    role: OrganizationRole;
  }) {
    const { user } = await auth.api.createUser({
      body: { email: input.email, password: TEST_PASSWORD, name: input.email },
    });
    await tenancyRepository.createMembership({
      organizationId: input.organizationId,
      userId: user.id,
      role: input.role,
    });
    return { userId: user.id, cookie: await signIn(input.email) };
  }

  return {
    env,
    db,
    client,
    auth,
    app,
    tenancyRepository,
    signIn,
    createMember,
    truncate: () => truncateAllTables(client),
    close: () => client.end({ timeout: 5 }),
  };
}

export type IntegrationContext = ReturnType<typeof createIntegrationContext>;

/** JSON request helper bound to one session cookie. */
export function asUser(context: IntegrationContext, cookie: string) {
  return (method: string, path: string, body?: unknown) =>
    context.app.request(path, {
      method,
      headers: {
        cookie,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
}
