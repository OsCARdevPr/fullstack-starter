import { apiErrorBodySchema } from "@starter/contracts";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../app";
import { createFakeDb, createTestDeps } from "../../test/fakes";

describe("health module", () => {
  it("GET /api/health reports liveness without touching the database", async () => {
    const execute = vi.fn();
    const app = createApp(createTestDeps({ db: createFakeDb(execute) }));

    const response = await app.request("/api/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { status: "ok" } });
    expect(execute).not.toHaveBeenCalled();
  });

  it("GET /api/health/ready reports ready when the database answers", async () => {
    const execute = vi.fn(async () => [{ "?column?": 1 }]);
    const app = createApp(createTestDeps({ db: createFakeDb(execute) }));

    const response = await app.request("/api/health/ready");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { status: "ready" } });
    expect(execute).toHaveBeenCalledOnce();
  });

  it("GET /api/health/ready responds 503 SERVICE_UNAVAILABLE when the database fails", async () => {
    const failing = createFakeDb(async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:5432");
    });
    const app = createApp(createTestDeps({ db: failing }));

    const response = await app.request("/api/health/ready");
    const body = apiErrorBodySchema.parse(await response.json());

    expect(response.status).toBe(503);
    expect(body.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(body.error.message).not.toContain("ECONNREFUSED");
  });
});
