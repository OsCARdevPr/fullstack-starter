import { publicConfigResponseSchema } from "@starter/contracts";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app";
import { createTestDeps } from "../../test/fakes";

describe("GET /api/config", () => {
  it("returns the public configuration without a session", async () => {
    const app = createApp(createTestDeps());

    const response = await app.request("/api/config");

    expect(response.status).toBe(200);
    expect(publicConfigResponseSchema.parse(await response.json())).toEqual({
      data: { tenancyMode: "single", allowSignup: false },
    });
  });

  it("reflects the server environment", async () => {
    const deps = createTestDeps({ env: { TENANCY_MODE: "multi", AUTH_ALLOW_SIGNUP: "true" } });

    const response = await createApp(deps).request("/api/config");

    expect(await response.json()).toEqual({ data: { tenancyMode: "multi", allowSignup: true } });
  });

  it("exposes only the public contract fields", async () => {
    const response = await createApp(createTestDeps()).request("/api/config");
    const { data } = (await response.json()) as { data: Record<string, unknown> };

    expect(Object.keys(data).sort()).toEqual(["allowSignup", "tenancyMode"]);
  });
});
