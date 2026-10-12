import { tenancyModeSchema } from "@starter/contracts";
import { z } from "zod";

export type EnvSource = Record<string, string | undefined>;

const DEV_SECRET_PREFIX = "dev-only-";

const positiveInt = z.coerce.number().int().positive();

const postgresUrl = z
  .url({ protocol: /^postgres(ql)?$/ })
  .describe("PostgreSQL connection string (postgres:// or postgresql://)");

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    DATABASE_URL: postgresUrl,
    BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
    BETTER_AUTH_URL: z.url(),
    WEB_ORIGIN: z.url().transform((value) => new URL(value).origin),
    TENANCY_MODE: tenancyModeSchema.default("single"),
    AUTH_ALLOW_SIGNUP: z.stringbool().default(false),
    DEFAULT_ORG_NAME: z.string().trim().min(1).max(120).default("Default Organization"),
    DEFAULT_ORG_SLUG: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be lowercase letters, digits and dashes")
      .default("default"),
    RATE_LIMIT_WINDOW_MS: positiveInt.default(60_000),
    RATE_LIMIT_MAX: positiveInt.default(100),
    BODY_LIMIT_BYTES: positiveInt.default(1_048_576),
    TRUST_PROXY: z.stringbool().default(false),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && env.BETTER_AUTH_SECRET.startsWith(DEV_SECRET_PREFIX)) {
      ctx.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_SECRET"],
        message: `must not use the "${DEV_SECRET_PREFIX}" placeholder in production`,
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export interface EnvIssue {
  path: string;
  message: string;
}

export class EnvValidationError extends Error {
  readonly issues: EnvIssue[];

  constructor(issues: EnvIssue[]) {
    const lines = issues.map((issue) => `  - ${issue.path}: ${issue.message}`);
    super(`Invalid environment variables:\n${lines.join("\n")}`);
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}

/** Validates an environment record. Empty strings count as unset so defaults still apply. */
export function parseEnv(source: EnvSource): Env {
  const present = Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ""));
  const result = envSchema.safeParse(present);
  if (result.success) return result.data;

  throw new EnvValidationError(
    result.error.issues.map((issue) => ({
      path: issue.path.join(".") || "(root)",
      message: issue.message,
    })),
  );
}

/** Reads `process.env`; throws an EnvValidationError listing every problem at once. */
export function loadEnv(): Env {
  return parseEnv(process.env);
}
