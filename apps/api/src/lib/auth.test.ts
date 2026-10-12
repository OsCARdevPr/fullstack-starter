import { describe, expect, it } from "vitest";
import { createTenancyService } from "../core/tenancy/service";
import { createDatabase } from "../db/client";
import { buildTestEnv } from "../test/fakes";
import { InMemoryTenancyRepository } from "../test/in-memory-tenancy-repository";
import { createAuth } from "./auth";

// postgres.js connects lazily, so building the auth instance never touches the database here.
function setup(envOverrides: Record<string, string> = {}) {
  const env = buildTestEnv(envOverrides);
  const repository = new InMemoryTenancyRepository();
  const tenancy = createTenancyService({
    repository,
    mode: env.TENANCY_MODE,
    defaultOrganization: { name: env.DEFAULT_ORG_NAME, slug: env.DEFAULT_ORG_SLUG },
  });
  const { db } = createDatabase(env.DATABASE_URL);
  return { auth: createAuth({ env, db, tenancy }), repository };
}

function pluginOptions(auth: ReturnType<typeof createAuth>, id: string) {
  const plugin = auth.options.plugins.find((candidate) => candidate.id === id);
  return (plugin as { options?: Record<string, unknown> } | undefined)?.options;
}

describe("createAuth", () => {
  it("applies the security baseline", () => {
    const { auth } = setup();

    expect(auth.options.basePath).toBe("/api/auth");
    expect(auth.options.trustedOrigins).toEqual(["http://localhost:5173"]);
    expect(auth.options.emailAndPassword).toMatchObject({ enabled: true, minPasswordLength: 12 });
    expect(auth.options.rateLimit).toMatchObject({ enabled: true, storage: "database" });
    expect(auth.options.session).toMatchObject({ expiresIn: 604_800, updateAge: 86_400 });
  });

  it("disables sign-up unless AUTH_ALLOW_SIGNUP is true", () => {
    expect(setup().auth.options.emailAndPassword.disableSignUp).toBe(true);
    expect(setup({ AUTH_ALLOW_SIGNUP: "true" }).auth.options.emailAndPassword.disableSignUp).toBe(
      false,
    );
  });

  it("uses secure cookies only in production", () => {
    expect(setup().auth.options.advanced.useSecureCookies).toBe(false);
    const production = setup({
      NODE_ENV: "production",
      BETTER_AUTH_SECRET: "a-production-secret-of-32-chars-min",
    });
    expect(production.auth.options.advanced.useSecureCookies).toBe(true);
  });

  it("lets users create organizations only in multi tenancy mode", () => {
    expect(pluginOptions(setup().auth, "organization")).toMatchObject({
      allowUserToCreateOrganization: false,
    });
    expect(pluginOptions(setup({ TENANCY_MODE: "multi" }).auth, "organization")).toMatchObject({
      allowUserToCreateOrganization: true,
    });
  });

  it("registers the organization and admin plugins", () => {
    const ids = setup().auth.options.plugins.map((plugin) => plugin.id);
    expect(ids).toEqual(expect.arrayContaining(["organization", "admin"]));
  });

  it("joins new users to the default organization in single mode", async () => {
    const { auth, repository } = setup();
    const afterUserCreate = auth.options.databaseHooks.user.create.after;

    await afterUserCreate({ id: "user-1" } as never);

    expect(repository.members).toMatchObject([{ userId: "user-1", role: "owner" }]);
  });

  it("sets the active organization when a session is created", async () => {
    const { auth, repository } = setup();
    const beforeSessionCreate = auth.options.databaseHooks.session.create.before;

    const result = await beforeSessionCreate({ userId: "user-1" } as never);

    expect(result).toEqual({ data: { activeOrganizationId: repository.organizations[0]?.id } });
  });

  it("keeps an active organization that is already set on the session", async () => {
    const { auth } = setup();
    const beforeSessionCreate = auth.options.databaseHooks.session.create.before;

    const result = await beforeSessionCreate({
      userId: "user-1",
      activeOrganizationId: "org-x",
    } as never);

    expect(result).toBeUndefined();
  });
});
