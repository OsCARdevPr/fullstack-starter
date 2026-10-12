import { projectListResponseSchema } from "@starter/contracts";
import { count, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { member, organization, projects, user } from "../../db/schema";
import { type SeedAdmin, seedDatabase } from "../../db/seed";
import { asUser, createIntegrationContext } from "./context";

const admin: SeedAdmin = {
  email: "Admin@Example.com",
  password: "seed-admin-password",
  name: "Platform Admin",
};

describe.each(["single", "multi"] as const)("seedDatabase in %s tenancy mode", (mode) => {
  const context = createIntegrationContext({
    TENANCY_MODE: mode,
    DEFAULT_ORG_NAME: "Acme",
    DEFAULT_ORG_SLUG: "acme",
  });

  beforeEach(async () => {
    await context.truncate();
  });

  afterAll(async () => {
    await context.close();
  });

  async function tableCount(table: typeof user | typeof organization | typeof projects) {
    const [row] = await context.db.select({ value: count() }).from(table);
    return row?.value;
  }

  it("creates the organization, the admin owner and sample projects only once", async () => {
    const first = await seedDatabase(context, admin);
    expect(first).toEqual({
      organization: { name: "Acme", slug: "acme", created: true },
      admin: { email: "admin@example.com", created: true },
      sampleProjects: 3,
    });

    const second = await seedDatabase(context, admin);
    expect(second).toEqual({
      organization: { name: "Acme", slug: "acme", created: false },
      admin: { email: "admin@example.com", created: false },
      sampleProjects: 0,
    });

    expect(await tableCount(user)).toBe(1);
    expect(await tableCount(organization)).toBe(1);
    expect(await tableCount(projects)).toBe(3);

    const [account] = await context.db
      .select({ role: user.role, memberRole: member.role })
      .from(user)
      .innerJoin(member, eq(member.userId, user.id));
    expect(account).toEqual({ role: "admin", memberRole: "owner" });
  });

  it("lets the seeded admin sign in and see the sample projects", async () => {
    await seedDatabase(context, admin);
    const send = asUser(context, await context.signIn(admin.email, admin.password));

    const response = await send("GET", "/api/projects?sort=name");
    const body = projectListResponseSchema.parse(await response.json());

    expect(body.meta.total).toBe(3);
  });

  it("adds no sample projects to an organization that already has projects", async () => {
    await seedDatabase(context, admin);
    await context.db.delete(projects).where(eq(projects.name, "Mobile app"));

    expect((await seedDatabase(context, admin)).sampleProjects).toBe(0);
    expect(await tableCount(projects)).toBe(2);
  });
});
