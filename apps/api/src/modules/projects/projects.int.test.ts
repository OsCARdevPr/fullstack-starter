import {
  apiErrorBodySchema,
  type CreateProjectInput,
  projectListResponseSchema,
  projectResponseSchema,
} from "@starter/contracts";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { projects } from "../../db/schema";
import { asUser, createIntegrationContext } from "../../test/integration/context";

const context = createIntegrationContext({ TENANCY_MODE: "multi" });

type Send = ReturnType<typeof asUser>;
let owner: Send;
let member: Send;
let outsider: Send;

beforeAll(async () => {
  await context.truncate();
  const acme = await context.tenancyRepository.createOrganization({ name: "Acme", slug: "acme" });
  const globex = await context.tenancyRepository.createOrganization({
    name: "Globex",
    slug: "globex",
  });
  const create = async (email: string, organizationId: string, role: "owner" | "member") =>
    asUser(context, (await context.createMember({ email, organizationId, role })).cookie);

  owner = await create("owner@acme.test", acme.id, "owner");
  member = await create("member@acme.test", acme.id, "member");
  outsider = await create("owner@globex.test", globex.id, "owner");
});

beforeEach(async () => {
  await context.db.delete(projects);
});

afterAll(async () => {
  await context.close();
});

async function createProject(send: Send, input: CreateProjectInput) {
  const response = await send("POST", "/api/projects", input);
  expect(response.status).toBe(201);
  return projectResponseSchema.parse(await response.json()).data;
}

async function list(send: Send, query = "") {
  const response = await send("GET", `/api/projects${query}`);
  expect(response.status).toBe(200);
  return projectListResponseSchema.parse(await response.json());
}

async function errorCode(response: Response) {
  return apiErrorBodySchema.parse(await response.json()).error.code;
}

describe("projects API against Postgres", () => {
  it("creates, reads, updates and deletes a project", async () => {
    const created = await createProject(owner, { name: "Website", description: "Landing page" });
    expect(created).toMatchObject({
      name: "Website",
      description: "Landing page",
      status: "active",
    });

    const read = await owner("GET", `/api/projects/${created.id}`);
    expect(projectResponseSchema.parse(await read.json()).data).toEqual(created);

    const patched = await owner("PATCH", `/api/projects/${created.id}`, {
      name: "Website v2",
      description: "",
      status: "archived",
    });
    const updated = projectResponseSchema.parse(await patched.json()).data;
    expect(updated).toMatchObject({ name: "Website v2", description: null, status: "archived" });
    expect(updated.createdAt).toBe(created.createdAt);
    expect(Date.parse(updated.updatedAt)).toBeGreaterThan(Date.parse(created.updatedAt));

    expect((await owner("DELETE", `/api/projects/${created.id}`)).status).toBe(204);
    expect((await owner("GET", `/api/projects/${created.id}`)).status).toBe(404);
  });

  it("searches case-insensitively, filters, sorts and paginates", async () => {
    for (const [name, status] of [
      ["Website redesign", "active"],
      ["Mobile app", "active"],
      ["Web shop", "archived"],
      ["Data warehouse", "active"],
      ["Internal tools", "archived"],
    ] as const) {
      await createProject(owner, { name, status });
    }

    const byNewest = await list(owner);
    expect(byNewest.data[0]?.name).toBe("Internal tools");
    expect(byNewest.meta).toEqual({ page: 1, pageSize: 20, total: 5, totalPages: 1 });

    const search = await list(owner, "?q=WEB&sort=name");
    expect(search.data.map(({ name }) => name)).toEqual(["Web shop", "Website redesign"]);

    const archived = await list(owner, "?status=archived&sort=name&order=desc");
    expect(archived.data.map(({ name }) => name)).toEqual(["Web shop", "Internal tools"]);

    const page = await list(owner, "?sort=name&pageSize=2&page=2");
    expect(page.data.map(({ name }) => name)).toEqual(["Mobile app", "Web shop"]);
    expect(page.meta).toEqual({ page: 2, pageSize: 2, total: 5, totalPages: 3 });

    expect((await list(owner, "?q=%25")).meta.total).toBe(0);
  });

  it("responds 409 CONFLICT for a duplicate name within one organization only", async () => {
    const original = await createProject(owner, { name: "Website" });
    const other = await createProject(owner, { name: "Shop" });

    const nameTaken = { code: "CONFLICT", message: "A project with this name already exists." };
    const duplicate = await owner("POST", "/api/projects", { name: "Website" });
    expect(duplicate.status).toBe(409);
    expect(apiErrorBodySchema.parse(await duplicate.json()).error).toMatchObject(nameTaken);

    const rename = await owner("PATCH", `/api/projects/${other.id}`, { name: original.name });
    expect(rename.status).toBe(409);
    expect(apiErrorBodySchema.parse(await rename.json()).error).toMatchObject(nameTaken);

    await createProject(outsider, { name: "Website" });
  });

  it("never exposes or changes another organization's projects", async () => {
    const project = await createProject(owner, { name: "Acme secret" });
    const path = `/api/projects/${project.id}`;

    expect((await list(outsider)).meta.total).toBe(0);
    for (const [method, body] of [
      ["GET", undefined],
      ["PATCH", { name: "Taken over" }],
      ["DELETE", undefined],
    ] as const) {
      const response = await outsider(method, path, body);
      expect(response.status).toBe(404);
      expect(await errorCode(response)).toBe("NOT_FOUND");
    }

    const unchanged = await owner("GET", path);
    expect(projectResponseSchema.parse(await unchanged.json()).data).toEqual(project);
  });

  it("lets members edit but not delete", async () => {
    const project = await createProject(member, { name: "Member project" });
    const path = `/api/projects/${project.id}`;

    expect((await member("PATCH", path, { status: "archived" })).status).toBe(200);

    const denied = await member("DELETE", path);
    expect(denied.status).toBe(403);
    expect(await errorCode(denied)).toBe("FORBIDDEN");
    expect((await owner("GET", path)).status).toBe(200);
  });
});
