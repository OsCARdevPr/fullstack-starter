import { apiErrorBodySchema } from "@starter/contracts";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { createCapturingLogger, createTestDeps } from "./test/fakes";

describe("createApp", () => {
  it("responds to unknown routes with the NOT_FOUND envelope", async () => {
    const response = await createApp(createTestDeps()).request("/api/does-not-exist");
    const body = apiErrorBodySchema.parse(await response.json());

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.requestId).toMatch(/\S+/);
  });

  it("returns the same request id in the body and the X-Request-Id header", async () => {
    const response = await createApp(createTestDeps()).request("/api/does-not-exist");
    const body = apiErrorBodySchema.parse(await response.json());

    expect(response.headers.get("x-request-id")).toBe(body.error.requestId);
  });

  it("propagates a well-formed incoming X-Request-Id", async () => {
    const response = await createApp(createTestDeps()).request("/api/health", {
      headers: { "x-request-id": "edge-1234" },
    });
    expect(response.headers.get("x-request-id")).toBe("edge-1234");
  });

  it("hides unexpected errors in production and logs them with the request id", async () => {
    const { logger, lines } = createCapturingLogger();
    const deps = createTestDeps({
      env: { NODE_ENV: "production", BETTER_AUTH_SECRET: "a-production-secret-of-32-chars-min" },
      logger,
      authHandler: async () => {
        throw new Error("secret internal detail");
      },
    });

    const response = await createApp(deps).request("/api/auth/get-session");
    const body = apiErrorBodySchema.parse(await response.json());

    expect(response.status).toBe(500);
    expect(body.error).toEqual({
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      requestId: response.headers.get("x-request-id"),
    });
    const errorLog = lines.find((line) => line.level === 50);
    expect(errorLog).toMatchObject({
      requestId: body.error.requestId,
      err: { message: "secret internal detail" },
    });
  });

  it("shows the real error message in development", async () => {
    const deps = createTestDeps({
      env: { NODE_ENV: "development" },
      authHandler: async () => {
        throw new Error("visible in development");
      },
    });

    const response = await createApp(deps).request("/api/auth/get-session");
    const body = apiErrorBodySchema.parse(await response.json());

    expect(body.error.message).toBe("visible in development");
  });

  it("logs each request with method, path, status and duration", async () => {
    const { logger, lines } = createCapturingLogger();
    await createApp(createTestDeps({ logger })).request("/api/health");

    expect(lines.find((line) => line.msg === "request completed")).toMatchObject({
      requestId: expect.any(String),
      method: "GET",
      path: "/api/health",
      status: 200,
      durationMs: expect.any(Number),
    });
  });

  it("sets security headers", async () => {
    const response = await createApp(createTestDeps()).request("/api/health");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
  });

  it("allows CORS with credentials only for WEB_ORIGIN", async () => {
    const app = createApp(createTestDeps());
    const preflight = (origin: string) =>
      app.request("/api/me", {
        method: "OPTIONS",
        headers: { origin, "access-control-request-method": "GET" },
      });

    const allowed = await preflight("http://localhost:5173");
    expect(allowed.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    expect(allowed.headers.get("access-control-allow-credentials")).toBe("true");

    const denied = await preflight("https://evil.example");
    expect(denied.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("rejects bodies larger than BODY_LIMIT_BYTES with the error envelope", async () => {
    const app = createApp(createTestDeps({ env: { BODY_LIMIT_BYTES: "16" } }));
    const payload = JSON.stringify({ email: "someone@example.com", password: "x".repeat(64) });

    const response = await app.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": String(payload.length) },
      body: payload,
    });
    const body = apiErrorBodySchema.parse(await response.json());

    expect(response.status).toBe(413);
    expect(body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("applies the general rate limit to API routes", async () => {
    const app = createApp(createTestDeps({ env: { RATE_LIMIT_MAX: "1" } }));

    expect((await app.request("/api/health")).status).toBe(200);
    const limited = await app.request("/api/health");

    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toMatch(/^\d+$/);
  });
});
