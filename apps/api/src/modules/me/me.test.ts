import { apiErrorBodySchema, meResponseSchema } from "@starter/contracts";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app";
import { buildSessionData, createTestDeps } from "../../test/fakes";
import { InMemoryTenancyRepository } from "../../test/in-memory-tenancy-repository";

describe("GET /api/me", () => {
  it("responds 401 UNAUTHENTICATED without a session", async () => {
    const response = await createApp(createTestDeps()).request("/api/me");

    expect(response.status).toBe(401);
    expect(apiErrorBodySchema.parse(await response.json()).error.code).toBe("UNAUTHENTICATED");
  });

  it("returns the user, active organization and role", async () => {
    const tenancyRepository = new InMemoryTenancyRepository();
    tenancyRepository.addOrganization({ id: "org-1", name: "Acme", slug: "acme" });
    tenancyRepository.addMember({ organizationId: "org-1", userId: "user-1", role: "owner" });
    const session = buildSessionData({
      user: { role: "admin" },
      session: { activeOrganizationId: "org-1" },
    });

    const response = await createApp(createTestDeps({ session, tenancyRepository })).request(
      "/api/me",
    );

    expect(response.status).toBe(200);
    expect(meResponseSchema.parse(await response.json())).toEqual({
      data: {
        user: {
          id: "user-1",
          name: "Ada Lovelace",
          email: "ada@example.com",
          emailVerified: true,
          image: null,
          role: "admin",
        },
        organization: { id: "org-1", name: "Acme", slug: "acme" },
        role: "owner",
        tenancyMode: "single",
      },
    });
  });

  it("returns a null organization for a user without an active organization", async () => {
    const deps = createTestDeps({ session: buildSessionData(), env: { TENANCY_MODE: "multi" } });

    const response = await createApp(deps).request("/api/me");
    const body = meResponseSchema.parse(await response.json());

    expect(body.data).toMatchObject({ organization: null, role: null, tenancyMode: "multi" });
  });

  it("does not expose fields outside the contract", async () => {
    const response = await createApp(createTestDeps({ session: buildSessionData() })).request(
      "/api/me",
    );
    const { data } = (await response.json()) as { data: { user: Record<string, unknown> } };

    expect(Object.keys(data.user).sort()).toEqual(
      ["email", "emailVerified", "id", "image", "name", "role"].sort(),
    );
  });
});
