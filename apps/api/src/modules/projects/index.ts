import {
  createProjectSchema,
  idSchema,
  listProjectsQuerySchema,
  updateProjectSchema,
} from "@starter/contracts";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../../core/context";
import { ok, paginated, validate } from "../../core/http";
import { requireAuth, requireOrgRole, session, tenant } from "../../core/middleware";
import type { AppDeps } from "../../deps";
import { createProjectsRepository, type ProjectsRepository } from "./repository";
import { createProjectsService } from "./service";

const projectParamsSchema = z.object({ id: idSchema });

export interface ProjectsRouterDeps extends Pick<AppDeps, "auth" | "db" | "tenancy"> {
  /** Unit tests pass a double; the app uses the Drizzle repository. */
  repository?: ProjectsRepository;
}

/** Projects CRUD, scoped to the active organization. Mounted at /api/projects. */
export function createProjectsRouter({
  auth,
  db,
  tenancy,
  repository = createProjectsRepository(db),
}: ProjectsRouterDeps) {
  const service = createProjectsService(repository);

  return new Hono<AppEnv>()
    .use(session(auth))
    .use(requireAuth)
    .use(tenant(tenancy))
    .get("/", validate("query", listProjectsQuerySchema), async (c) => {
      const query = c.req.valid("query");
      const { items, total } = await service.list(c.get("tenant").organizationId, query);
      return paginated(c, items, { page: query.page, pageSize: query.pageSize, total });
    })
    .get("/:id", validate("param", projectParamsSchema), async (c) => {
      const { id } = c.req.valid("param");
      return ok(c, await service.get(c.get("tenant").organizationId, id));
    })
    .post("/", validate("json", createProjectSchema), async (c) => {
      const project = await service.create(c.get("tenant").organizationId, c.req.valid("json"));
      return ok(c, project, 201);
    })
    .patch(
      "/:id",
      validate("param", projectParamsSchema),
      validate("json", updateProjectSchema),
      async (c) => {
        const { id } = c.req.valid("param");
        const input = c.req.valid("json");
        return ok(c, await service.update(c.get("tenant").organizationId, id, input));
      },
    )
    .delete(
      "/:id",
      requireOrgRole("owner", "admin"),
      validate("param", projectParamsSchema),
      async (c) => {
        const { id } = c.req.valid("param");
        await service.remove(c.get("tenant").organizationId, id);
        return c.body(null, 204);
      },
    );
}
