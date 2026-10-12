import { type EnvSource, parseEnv } from "../config/env";
import { createTenancyService } from "../core/tenancy/service";
import type { Database } from "../db/client";
import type { AppDeps } from "../deps";
import type { AppAuth, AuthSessionData } from "../lib/auth";
import { createLogger, type Logger } from "../lib/logger";
import { InMemoryTenancyRepository } from "./in-memory-tenancy-repository";

export const testEnvSource: EnvSource = {
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  DATABASE_URL: "postgres://starter:starter@localhost:5432/starter_test",
  BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-characters",
  BETTER_AUTH_URL: "http://localhost:3000",
  WEB_ORIGIN: "http://localhost:5173",
};

export function buildTestEnv(overrides: EnvSource = {}) {
  return parseEnv({ ...testEnvSource, ...overrides });
}

type SessionOverrides = {
  user?: Partial<AuthSessionData["user"]>;
  session?: Partial<AuthSessionData["session"]>;
};

export function buildSessionData(overrides: SessionOverrides = {}): AuthSessionData {
  const now = new Date("2026-10-11T12:00:00.000Z");
  const user: AuthSessionData["user"] = {
    id: "user-1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    emailVerified: true,
    image: null,
    createdAt: now,
    updatedAt: now,
    role: "user",
    banned: false,
    banReason: null,
    banExpires: null,
    ...overrides.user,
  };
  const session: AuthSessionData["session"] = {
    id: "session-1",
    userId: user.id,
    token: "session-token",
    expiresAt: new Date(now.getTime() + 86_400_000),
    ipAddress: null,
    userAgent: null,
    createdAt: now,
    updatedAt: now,
    activeOrganizationId: null,
    impersonatedBy: null,
    ...overrides.session,
  };
  return { user, session };
}

export function createFakeAuth(
  options: {
    session?: AuthSessionData | null;
    handler?: (request: Request) => Promise<Response>;
  } = {},
): AppAuth {
  return {
    handler: options.handler ?? (async () => new Response(null, { status: 204 })),
    api: { getSession: async () => options.session ?? null },
  };
}

/** Only `execute` is used without a database (health readiness). */
export function createFakeDb(execute: () => Promise<unknown> = async () => []): Database {
  return { execute } as unknown as Database;
}

/** Logger that keeps parsed JSON lines in memory so tests can assert on them. */
export function createCapturingLogger(level = "debug") {
  const lines: Record<string, unknown>[] = [];
  const logger = createLogger(
    { level, pretty: false },
    { write: (line: string) => lines.push(JSON.parse(line)) },
  );
  return { logger, lines };
}

export interface TestDepsOptions {
  env?: EnvSource;
  session?: AuthSessionData | null;
  authHandler?: (request: Request) => Promise<Response>;
  db?: Database;
  logger?: Logger;
  tenancyRepository?: InMemoryTenancyRepository;
}

export function createTestDeps(options: TestDepsOptions = {}): AppDeps {
  const env = buildTestEnv(options.env);
  return {
    env,
    db: options.db ?? createFakeDb(),
    auth: createFakeAuth({ session: options.session, handler: options.authHandler }),
    logger: options.logger ?? createLogger({ level: "silent", pretty: false }),
    tenancy: createTenancyService({
      repository: options.tenancyRepository ?? new InMemoryTenancyRepository(),
      mode: env.TENANCY_MODE,
      defaultOrganization: { name: env.DEFAULT_ORG_NAME, slug: env.DEFAULT_ORG_SLUG },
    }),
  };
}
