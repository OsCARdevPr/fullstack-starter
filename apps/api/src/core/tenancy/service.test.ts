import { describe, expect, it } from "vitest";
import { InMemoryTenancyRepository } from "../../test/in-memory-tenancy-repository";
import { createTenancyService } from "./service";

const defaultOrganization = { name: "Acme", slug: "acme" };

function setup(mode: "single" | "multi") {
  const repository = new InMemoryTenancyRepository();
  const tenancy = createTenancyService({ repository, mode, defaultOrganization });
  return { repository, tenancy };
}

describe("ensureDefaultMembership", () => {
  it("creates the default organization and makes its first member the owner", async () => {
    const { repository, tenancy } = setup("single");

    const organization = await tenancy.ensureDefaultMembership("user-1");

    expect(organization).toMatchObject(defaultOrganization);
    expect(repository.members).toMatchObject([
      { organizationId: organization.id, userId: "user-1", role: "owner" },
    ]);
  });

  it("is idempotent for the same user", async () => {
    const { repository, tenancy } = setup("single");

    const first = await tenancy.ensureDefaultMembership("user-1");
    const second = await tenancy.ensureDefaultMembership("user-1");

    expect(second).toEqual(first);
    expect(repository.organizations).toHaveLength(1);
    expect(repository.members).toHaveLength(1);
  });

  it("adds later users as regular members of the same organization", async () => {
    const { repository, tenancy } = setup("single");

    await tenancy.ensureDefaultMembership("user-1");
    await tenancy.ensureDefaultMembership("user-2");

    expect(repository.organizations).toHaveLength(1);
    expect(repository.members.map(({ userId, role }) => ({ userId, role }))).toEqual([
      { userId: "user-1", role: "owner" },
      { userId: "user-2", role: "member" },
    ]);
  });

  it("reuses an organization that already exists with the default slug", async () => {
    const { repository, tenancy } = setup("single");
    repository.addOrganization({ id: "seeded-org", name: "Seeded", slug: "acme" });

    const organization = await tenancy.ensureDefaultMembership("user-1");

    expect(organization.id).toBe("seeded-org");
    expect(repository.organizations).toHaveLength(1);
  });
});

describe("resolveActiveOrganizationId", () => {
  it("returns the default organization in single mode, joining it when needed", async () => {
    const { repository, tenancy } = setup("single");

    const organizationId = await tenancy.resolveActiveOrganizationId("user-1");

    expect(organizationId).toBe(repository.organizations[0]?.id);
    expect(repository.members).toHaveLength(1);
  });

  it("returns the oldest membership in multi mode", async () => {
    const { repository, tenancy } = setup("multi");
    repository.addOrganization({ id: "org-a", name: "A", slug: "a" });
    repository.addOrganization({ id: "org-b", name: "B", slug: "b" });
    repository.addMember({ organizationId: "org-b", userId: "user-1", role: "member" });
    repository.addMember({ organizationId: "org-a", userId: "user-1", role: "owner" });

    expect(await tenancy.resolveActiveOrganizationId("user-1")).toBe("org-b");
  });

  it("returns null in multi mode for a user without memberships and creates nothing", async () => {
    const { repository, tenancy } = setup("multi");

    expect(await tenancy.resolveActiveOrganizationId("user-1")).toBeNull();
    expect(repository.organizations).toHaveLength(0);
  });
});

describe("findMembership", () => {
  it("returns the organization and the parsed role", async () => {
    const { repository, tenancy } = setup("multi");
    repository.addOrganization({ id: "org-a", name: "A", slug: "a" });
    repository.addMember({ organizationId: "org-a", userId: "user-1", role: "admin" });

    expect(await tenancy.findMembership("org-a", "user-1")).toEqual({
      organization: { id: "org-a", name: "A", slug: "a" },
      role: "admin",
    });
  });

  it("picks the highest known role from a comma-separated role list", async () => {
    const { repository, tenancy } = setup("multi");
    repository.addOrganization({ id: "org-a", name: "A", slug: "a" });
    repository.addMember({ organizationId: "org-a", userId: "user-1", role: "member, admin" });

    expect((await tenancy.findMembership("org-a", "user-1"))?.role).toBe("admin");
  });

  it("denies access when the stored role is unknown", async () => {
    const { repository, tenancy } = setup("multi");
    repository.addOrganization({ id: "org-a", name: "A", slug: "a" });
    repository.addMember({ organizationId: "org-a", userId: "user-1", role: "auditor" });

    expect(await tenancy.findMembership("org-a", "user-1")).toBeNull();
  });

  it("returns null when the user is not a member", async () => {
    const { tenancy } = setup("multi");
    expect(await tenancy.findMembership("org-a", "user-1")).toBeNull();
  });
});
