import type { Me } from "@starter/contracts";
import { hc, type InferResponseType } from "hono/client";
import { describe, expect, expectTypeOf, it } from "vitest";
import { type AppType, createApp } from "./app";
import { buildSessionData, createTestDeps } from "./test/fakes";

function createClient(deps = createTestDeps()) {
  const app = createApp(deps);
  return hc<AppType>("http://localhost", {
    fetch: (input: string | URL | Request, init?: RequestInit) => app.request(input, init),
  });
}

describe("AppType RPC client", () => {
  it("types the health response", async () => {
    const response = await createClient().api.health.$get();
    const body = await response.json();

    expectTypeOf(body).toEqualTypeOf<{ data: { status: "ok" } }>();
    expect(body).toEqual({ data: { status: "ok" } });
  });

  it("types the me response from the shared contract", async () => {
    const client = createClient(createTestDeps({ session: buildSessionData() }));
    const response = await client.api.me.$get();

    expectTypeOf<InferResponseType<typeof client.api.me.$get, 200>>().toEqualTypeOf<{
      data: Me;
    }>();
    expect(response.status).toBe(200);
  });
});
