import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, organization } from "better-auth/plugins";
import type { Env } from "../config/env";
import type { TenancyService } from "../core/tenancy/service";
import type { Database } from "../db/client";
import * as schema from "../db/schema";
import type { Logger } from "./logger";

const DAY_IN_SECONDS = 60 * 60 * 24;

export interface AuthDeps {
  env: Env;
  db: Database;
  tenancy: TenancyService;
  /** Receives Better Auth's own logs; defaults to Better Auth's console logger. */
  logger?: Logger;
}

export function createAuth({ env, db, tenancy, logger }: AuthDeps) {
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.WEB_ORIGIN],
    // Hooks below write through the app's Drizzle instance, which is only safe while the adapter
    // runs without its own transactions (the default). Revisit the hooks before enabling them.
    database: drizzleAdapter(db, { provider: "pg", schema, transaction: false }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      disableSignUp: !env.AUTH_ALLOW_SIGNUP,
    },
    session: {
      expiresIn: 7 * DAY_IN_SECONDS,
      updateAge: DAY_IN_SECONDS,
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
      },
    },
    advanced: {
      useSecureCookies: env.NODE_ENV === "production",
    },
    telemetry: { enabled: false },
    logger: logger
      ? {
          level: "info",
          log: (level, message, ...args) => logger[level]({ args, source: "better-auth" }, message),
        }
      : undefined,
    plugins: [
      organization({ allowUserToCreateOrganization: env.TENANCY_MODE === "multi" }),
      admin(),
    ],
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            if (tenancy.mode === "single") await tenancy.ensureDefaultMembership(user.id);
          },
        },
      },
      session: {
        create: {
          // Runs before `user.create.after` during sign-up, so single mode joins the default
          // organization here as well; both paths are idempotent.
          before: async (session) => {
            if (session.activeOrganizationId) return;
            const activeOrganizationId = await tenancy.resolveActiveOrganizationId(session.userId);
            if (activeOrganizationId) return { data: { activeOrganizationId } };
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

export type AuthSessionData = Auth["$Infer"]["Session"];

/** The slice of Better Auth the HTTP layer depends on; tests replace it with a fake. */
export interface AppAuth {
  handler: (request: Request) => Promise<Response>;
  api: {
    getSession: (context: { headers: Headers }) => Promise<AuthSessionData | null>;
  };
}
