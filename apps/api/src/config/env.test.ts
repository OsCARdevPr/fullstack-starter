import { describe, expect, it } from "vitest";
import { EnvValidationError, parseEnv } from "./env";

const required = {
  DATABASE_URL: "postgres://starter:starter@localhost:5432/starter",
  BETTER_AUTH_SECRET: "a-secret-value-that-is-long-enough-123",
  BETTER_AUTH_URL: "http://localhost:3000",
  WEB_ORIGIN: "http://localhost:5173",
};

function captureError(fn: () => unknown): EnvValidationError {
  try {
    fn();
  } catch (error) {
    if (error instanceof EnvValidationError) return error;
    throw error;
  }
  throw new Error("Expected parseEnv to throw an EnvValidationError");
}

describe("parseEnv", () => {
  it("applies defaults for every optional variable", () => {
    const env = parseEnv(required);

    expect(env).toMatchObject({
      NODE_ENV: "development",
      PORT: 3000,
      LOG_LEVEL: "info",
      TENANCY_MODE: "single",
      AUTH_ALLOW_SIGNUP: false,
      DEFAULT_ORG_NAME: "Default Organization",
      DEFAULT_ORG_SLUG: "default",
      RATE_LIMIT_WINDOW_MS: 60_000,
      RATE_LIMIT_MAX: 100,
      BODY_LIMIT_BYTES: 1_048_576,
      TRUST_PROXY: false,
    });
  });

  it("parses boolean flags from their string forms", () => {
    expect(parseEnv({ ...required, AUTH_ALLOW_SIGNUP: "true", TRUST_PROXY: "1" })).toMatchObject({
      AUTH_ALLOW_SIGNUP: true,
      TRUST_PROXY: true,
    });
    expect(parseEnv({ ...required, AUTH_ALLOW_SIGNUP: "false", TRUST_PROXY: "0" })).toMatchObject({
      AUTH_ALLOW_SIGNUP: false,
      TRUST_PROXY: false,
    });
  });

  it("rejects a boolean flag that is not a recognized boolean string", () => {
    const error = captureError(() => parseEnv({ ...required, AUTH_ALLOW_SIGNUP: "maybe" }));
    expect(error.issues.map((issue) => issue.path)).toEqual(["AUTH_ALLOW_SIGNUP"]);
  });

  it("coerces numeric variables and rejects non-numeric ones", () => {
    expect(parseEnv({ ...required, PORT: "8080" }).PORT).toBe(8080);
    const error = captureError(() => parseEnv({ ...required, PORT: "eighty" }));
    expect(error.issues.map((issue) => issue.path)).toEqual(["PORT"]);
  });

  it("treats empty strings as unset so defaults still apply", () => {
    expect(parseEnv({ ...required, PORT: "", TENANCY_MODE: "" })).toMatchObject({
      PORT: 3000,
      TENANCY_MODE: "single",
    });
  });

  it("rejects a secret shorter than 32 characters", () => {
    const error = captureError(() => parseEnv({ ...required, BETTER_AUTH_SECRET: "too-short" }));
    expect(error.issues.map((issue) => issue.path)).toEqual(["BETTER_AUTH_SECRET"]);
    expect(error.message).toContain("BETTER_AUTH_SECRET");
  });

  it("rejects the development placeholder secret in production", () => {
    const placeholder = "dev-only-change-me-0123456789abcdef0123";
    expect(parseEnv({ ...required, BETTER_AUTH_SECRET: placeholder }).BETTER_AUTH_SECRET).toBe(
      placeholder,
    );

    const error = captureError(() =>
      parseEnv({ ...required, NODE_ENV: "production", BETTER_AUTH_SECRET: placeholder }),
    );
    expect(error.issues.map((issue) => issue.path)).toEqual(["BETTER_AUTH_SECRET"]);
  });

  it("reports every invalid variable at once in a readable message", () => {
    const error = captureError(() => parseEnv({ WEB_ORIGIN: "not-a-url" }));

    expect(error.issues.map((issue) => issue.path).sort()).toEqual([
      "BETTER_AUTH_SECRET",
      "BETTER_AUTH_URL",
      "DATABASE_URL",
      "WEB_ORIGIN",
    ]);
    expect(error.message).toMatch(/^Invalid environment variables:\n {2}- /);
  });

  it("only accepts postgres connection strings", () => {
    const error = captureError(() =>
      parseEnv({ ...required, DATABASE_URL: "mysql://root@localhost/app" }),
    );
    expect(error.issues.map((issue) => issue.path)).toEqual(["DATABASE_URL"]);
  });

  it("normalizes WEB_ORIGIN to a bare origin", () => {
    expect(parseEnv({ ...required, WEB_ORIGIN: "http://localhost:5173/" }).WEB_ORIGIN).toBe(
      "http://localhost:5173",
    );
  });

  it("rejects a default organization slug that is not URL-safe", () => {
    const error = captureError(() => parseEnv({ ...required, DEFAULT_ORG_SLUG: "Not A Slug" }));
    expect(error.issues.map((issue) => issue.path)).toEqual(["DEFAULT_ORG_SLUG"]);
  });
});
