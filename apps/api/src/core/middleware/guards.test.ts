import { apiErrorBodySchema } from "@starter/contracts";
import { describe, expect, it } from "vitest";
import type { AuthSessionData } from "../../lib/auth";
import { createBareApp } from "../../test/bare-app";
import { buildSessionData, createFakeAuth } from "../../test/fakes";
import { InMemoryTenancyRepository } from "../../test/in-memory-tenancy-repository";
import { createTenancyService } from "../tenancy/service";
import { requireAuth } from "./require-auth";
import { requireOrgRole } from "./require-org-role";
import { requirePlatformRole } from "./require-platform-role";
import { session } from "./session";
import { tenant } from "./tenant";

function createTenancy() {
  const repository = new InMemoryTenancyRepository();
  repository.addOrganization({ id: "org-1", name: "Acme", slug: "acme" });
  const tenancy = createTenancyService({
    repository,
    mode: "multi",
    defaultOrganization: { name: "Acme", slug: "acme" },
  });
  return { repository, tenancy };
}

function createApp(sessionData: AuthSessionData | null, setup = createTenancy()) {
  const auth = createFakeAuth({ session: sessionData });
  const app = createBareApp()
    .get("/public", session(auth), (c) => c.json({ data: c.get("user")?.id ?? null }))
    .get("/private", session(auth), requireAuth, (c) => c.json({ data: c.get("user").id }))
    .get("/admin", session(auth), requireAuth, requirePlatformRole("admin"), (c) =>
      c.json({ data: "admin area" }),
    )
    .get("/org", session(auth), requireAuth, tenant(setup.tenancy), (c) =>
      c.json({ data: c.get("tenant") }),
    )
    .get(
      "/org/settings",
      session(auth),
      requireAuth,
      tenant(setup.tenancy),
      requireOrgRole("owner", "admin"),
      (c) => c.json({ data: "settings" }),
    );
  return { app, ...setup };
}

async function errorCode(response: Response) {
  return apiErrorBodySchema.parse(await response.json()).error.code;
}

describe("session", () => {
  it("leaves the user unset for anonymous requests without failing", async () => {
    const { app } = createApp(null);
    const response = await app.request("/public");
    expect(await response.json()).toEqual({ data: null });
  });

  it("loads the user and session into the context", async () => {
    const { app } = createApp(buildSessionData());
    expect(await (await app.request("/public")).json()).toEqual({ data: "user-1" });
  });
});

describe("requireAuth", () => {
  it("responds 401 UNAUTHENTICATED without a session", async () => {
    const response = await createApp(null).app.request("/private");
    expect(response.status).toBe(401);
    expect(await errorCode(response)).toBe("UNAUTHENTICATED");
  });

  it("lets authenticated requests through", async () => {
    const response = await createApp(buildSessionData()).app.request("/private");
    expect(await response.json()).toEqual({ data: "user-1" });
  });
});

describe("requirePlatformRole", () => {
  it("responds 403 FORBIDDEN for a regular user", async () => {
    const response = await createApp(buildSessionData()).app.request("/admin");
    expect(response.status).toBe(403);
    expect(await errorCode(response)).toBe("FORBIDDEN");
  });

  it("accepts a user whose role list contains the required role", async () => {
    const admin = buildSessionData({ user: { role: "user,admin" } });
    expect((await createApp(admin).app.request("/admin")).status).toBe(200);
  });
});

describe("tenant", () => {
  it("responds 403 FORBIDDEN when the session has no active organization", async () => {
    const response = await createApp(buildSessionData()).app.request("/org");
    expect(response.status).toBe(403);
    expect(await errorCode(response)).toBe("FORBIDDEN");
  });

  it("responds 403 FORBIDDEN when the user is not a member of the active organization", async () => {
    const sessionData = buildSessionData({ session: { activeOrganizationId: "org-1" } });
    const response = await createApp(sessionData).app.request("/org");
    expect(response.status).toBe(403);
  });

  it("sets the tenant for a member of the active organization", async () => {
    const setup = createTenancy();
    setup.repository.addMember({ organizationId: "org-1", userId: "user-1", role: "member" });
    const sessionData = buildSessionData({ session: { activeOrganizationId: "org-1" } });

    const response = await createApp(sessionData, setup).app.request("/org");

    expect(await response.json()).toEqual({
      data: {
        organizationId: "org-1",
        organization: { id: "org-1", name: "Acme", slug: "acme" },
        role: "member",
      },
    });
  });
});

describe("requireOrgRole", () => {
  function appWithRole(role: string) {
    const setup = createTenancy();
    setup.repository.addMember({ organizationId: "org-1", userId: "user-1", role });
    const sessionData = buildSessionData({ session: { activeOrganizationId: "org-1" } });
    return createApp(sessionData, setup).app;
  }

  it("responds 403 FORBIDDEN when the member role is not allowed", async () => {
    const response = await appWithRole("member").request("/org/settings");
    expect(response.status).toBe(403);
  });

  it("allows an allowed role", async () => {
    expect((await appWithRole("admin").request("/org/settings")).status).toBe(200);
  });
});
