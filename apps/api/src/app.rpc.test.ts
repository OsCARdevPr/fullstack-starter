import type {
  CreateProjectInput,
  ListProjectsQueryInput,
  Me,
  PaginatedEnvelope,
  Project,
  PublicConfig,
} from "@starter/contracts";
import { hc, type InferRequestType, type InferResponseType } from "hono/client";
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

  it("types the public config response from the shared contract", async () => {
    const client = createClient();
    const response = await client.api.config.$get();

    expectTypeOf<InferResponseType<typeof client.api.config.$get, 200>>().toEqualTypeOf<{
      data: PublicConfig;
    }>();
    expect(await response.json()).toEqual({ data: { tenancyMode: "single", allowSignup: false } });
  });

  it("types the me response from the shared contract", async () => {
    const client = createClient(createTestDeps({ session: buildSessionData() }));
    const response = await client.api.me.$get();

    expectTypeOf<InferResponseType<typeof client.api.me.$get, 200>>().toEqualTypeOf<{
      data: Me;
    }>();
    expect(response.status).toBe(200);
  });

  it("types the projects routes from the shared contracts", async () => {
    const client = createClient();
    const projects = client.api.projects;
    const project = projects[":id"];

    expectTypeOf<InferResponseType<typeof projects.$get, 200>>().toEqualTypeOf<
      PaginatedEnvelope<Project>
    >();
    expectTypeOf<InferResponseType<typeof project.$get, 200>>().toEqualTypeOf<{ data: Project }>();
    expectTypeOf<InferResponseType<typeof projects.$post, 201>>().toEqualTypeOf<{
      data: Project;
    }>();
    expectTypeOf<InferResponseType<typeof project.$patch, 200>>().toEqualTypeOf<{
      data: Project;
    }>();
    expectTypeOf<
      InferRequestType<typeof projects.$post>["json"]
    >().toEqualTypeOf<CreateProjectInput>();
    expectTypeOf<InferRequestType<typeof projects.$get>["query"]>().toExtend<
      Pick<ListProjectsQueryInput, "q" | "status" | "sort" | "order">
    >();

    // Coerced query fields (page, pageSize) are typed as strings on the client.
    const response = await projects.$get({ query: { page: "2", status: "archived" } });
    expect(response.status).toBe(401);
  });
});
