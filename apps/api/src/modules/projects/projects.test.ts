import { randomUUID } from "node:crypto";
import {
  apiErrorBodySchema,
  type ListProjectsQuery,
  type OrganizationRole,
  type Project,
  projectListResponseSchema,
  projectResponseSchema,
} from "@starter/contracts";
import { describe, expect, it } from "vitest";
import type { AuthSessionData } from "../../lib/auth";
import { createBareApp } from "../../test/bare-app";
import { buildSessionData, createTestDeps } from "../../test/fakes";
import { InMemoryTenancyRepository } from "../../test/in-memory-tenancy-repository";
import { createProjectsRouter } from "./index";
import type { ProjectsRepository } from "./repository";

const ORG_A = "org-a";
const ORG_B = "org-b";
const NOW = "2026-10-11T12:00:00.000Z";

function buildProject(overrides: Partial<Project> = {}): Project {
  return {
    id: randomUUID(),
    organizationId: ORG_A,
    name: "Website redesign",
    description: null,
    status: "active",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

/** Repository double: scopes by organization like the real one and records list queries. */
function createFakeRepository(initial: Project[]) {
  const store = [...initial];
  const listQueries: ListProjectsQuery[] = [];
  const find = (organizationId: string, id: string) =>
    store.find((project) => project.organizationId === organizationId && project.id === id);

  const repository: ProjectsRepository = {
    async list(organizationId, query) {
      listQueries.push(query);
      const items = store.filter((project) => project.organizationId === organizationId);
      return { items, total: items.length };
    },
    async findById(organizationId, id) {
      return find(organizationId, id) ?? null;
    },
    async create(organizationId, input) {
      const project = buildProject({
        organizationId,
        name: input.name,
        description: input.description ?? null,
        status: input.status,
      });
      store.push(project);
      return project;
    },
    async update(organizationId, id, input) {
      const project = find(organizationId, id);
      if (!project) return null;
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined) Object.assign(project, { [key]: value });
      }
      return project;
    },
    async remove(organizationId, id) {
      const project = find(organizationId, id);
      if (!project) return false;
      store.splice(store.indexOf(project), 1);
      return true;
    },
  };
  return { repository, store, listQueries };
}

interface SetupOptions {
  role?: OrganizationRole;
  projects?: Project[];
  session?: AuthSessionData | null;
}

function setup({ role = "owner", projects = [], session }: SetupOptions = {}) {
  const tenancyRepository = new InMemoryTenancyRepository();
  tenancyRepository.addOrganization({ id: ORG_A, name: "Acme", slug: "acme" });
  tenancyRepository.addOrganization({ id: ORG_B, name: "Globex", slug: "globex" });
  tenancyRepository.addMember({ organizationId: ORG_A, userId: "user-1", role });

  const deps = createTestDeps({
    session:
      session === undefined
        ? buildSessionData({ session: { activeOrganizationId: ORG_A } })
        : session,
    tenancyRepository,
  });
  const fake = createFakeRepository(projects);
  const app = createBareApp().route(
    "/api/projects",
    createProjectsRouter({ ...deps, repository: fake.repository }),
  );

  function request(method: string, path: string, body?: unknown) {
    return app.request(`/api/projects${path}`, {
      method,
      headers: body === undefined ? {} : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  return { request, ...fake };
}

async function readError(response: Response) {
  return apiErrorBodySchema.parse(await response.json()).error;
}

describe("projects router", () => {
  it("responds 401 UNAUTHENTICATED without a session", async () => {
    const response = await setup({ session: null }).request("GET", "");

    expect(response.status).toBe(401);
    expect((await readError(response)).code).toBe("UNAUTHENTICATED");
  });

  describe("GET /", () => {
    it("lists only the active organization's projects in the paginated envelope", async () => {
      const own = buildProject();
      const foreign = buildProject({ organizationId: ORG_B, name: "Secret" });
      const response = await setup({ projects: [own, foreign] }).request("GET", "");

      expect(response.status).toBe(200);
      expect(projectListResponseSchema.parse(await response.json())).toEqual({
        data: [own],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      });
    });

    it("passes the parsed query to the repository and echoes the page in meta", async () => {
      const { request, listQueries } = setup();
      const response = await request(
        "GET",
        "?page=2&pageSize=5&q=%20web%20&status=archived&sort=name&order=asc",
      );

      expect(listQueries).toEqual([
        { page: 2, pageSize: 5, q: "web", status: "archived", sort: "name", order: "asc" },
      ]);
      expect(projectListResponseSchema.parse(await response.json()).meta).toEqual({
        page: 2,
        pageSize: 5,
        total: 0,
        totalPages: 0,
      });
    });

    it("rejects an invalid query with 422 and field errors", async () => {
      const response = await setup().request("GET", "?pageSize=500&status=deleted");
      const error = await readError(response);

      expect(response.status).toBe(422);
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.details).toMatchObject({
        fieldErrors: { pageSize: expect.any(Array), status: expect.any(Array) },
      });
    });
  });

  describe("GET /:id", () => {
    it("returns the project in the data envelope", async () => {
      const project = buildProject();
      const response = await setup({ projects: [project] }).request("GET", `/${project.id}`);

      expect(response.status).toBe(200);
      expect(projectResponseSchema.parse(await response.json())).toEqual({ data: project });
    });

    it("rejects an id that is not a uuid with 422", async () => {
      const response = await setup().request("GET", "/not-a-uuid");
      const error = await readError(response);

      expect(response.status).toBe(422);
      expect(error.details).toMatchObject({ fieldErrors: { id: expect.any(Array) } });
    });
  });

  it.each([
    ["GET", undefined],
    ["PATCH", { name: "Renamed" }],
    ["DELETE", undefined],
  ])("responds 404 to %s on a project of another organization", async (method, body) => {
    const foreign = buildProject({ organizationId: ORG_B });
    const { request, store } = setup({ projects: [foreign] });
    const response = await request(method, `/${foreign.id}`, body);

    expect(response.status).toBe(404);
    expect((await readError(response)).code).toBe("NOT_FOUND");
    expect(store).toEqual([foreign]);
  });

  describe("POST /", () => {
    it("creates a project in the active organization and responds 201", async () => {
      const { request, store } = setup();
      const response = await request("POST", "", {
        name: "  Website  ",
        description: "",
        organizationId: ORG_B,
      });
      const body = projectResponseSchema.parse(await response.json());

      expect(response.status).toBe(201);
      expect(body.data).toMatchObject({
        organizationId: ORG_A,
        name: "Website",
        description: null,
        status: "active",
      });
      expect(store).toHaveLength(1);
    });

    it("rejects an invalid project with 422 and field errors", async () => {
      const { request, store } = setup();
      const response = await request("POST", "", { name: "x", status: "deleted" });
      const error = await readError(response);

      expect(response.status).toBe(422);
      expect(error.details).toMatchObject({
        fieldErrors: { name: expect.any(Array), status: expect.any(Array) },
      });
      expect(store).toHaveLength(0);
    });
  });

  describe("PATCH /:id", () => {
    it("updates only the provided fields", async () => {
      const project = buildProject({ description: "Keep me" });
      const response = await setup({ projects: [project] }).request("PATCH", `/${project.id}`, {
        status: "archived",
      });

      expect(response.status).toBe(200);
      expect(projectResponseSchema.parse(await response.json()).data).toMatchObject({
        name: "Website redesign",
        description: "Keep me",
        status: "archived",
      });
    });

    it("rejects an empty update with 422", async () => {
      const project = buildProject();
      const response = await setup({ projects: [project] }).request("PATCH", `/${project.id}`, {});
      const error = await readError(response);

      expect(response.status).toBe(422);
      expect(error.details).toMatchObject({ formErrors: [expect.any(String)] });
    });
  });

  describe("DELETE /:id", () => {
    it.each(["owner", "admin"] as const)("lets an %s delete with 204", async (role) => {
      const project = buildProject();
      const { request, store } = setup({ role, projects: [project] });
      const response = await request("DELETE", `/${project.id}`);

      expect(response.status).toBe(204);
      expect(await response.text()).toBe("");
      expect(store).toHaveLength(0);
    });

    it("forbids members from deleting", async () => {
      const project = buildProject();
      const { request, store } = setup({ role: "member", projects: [project] });
      const response = await request("DELETE", `/${project.id}`);

      expect(response.status).toBe(403);
      expect((await readError(response)).code).toBe("FORBIDDEN");
      expect(store).toEqual([project]);
    });
  });
});
