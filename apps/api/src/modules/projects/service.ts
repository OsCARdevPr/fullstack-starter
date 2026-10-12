import type { CreateProject, ListProjectsQuery, Project, UpdateProject } from "@starter/contracts";
import { conflict, notFound } from "../../core/errors";
import type { ProjectsRepository } from "./repository";

const PROJECT_NOT_FOUND = "Project not found.";
const PROJECT_NAME_TAKEN = "A project with this name already exists.";
/** Unique index on (organization_id, name), declared in db/schema/projects.ts. */
const UNIQUE_NAME_INDEX = "projects_organization_id_name_uidx";

/** Postgres rejected a duplicate name. Drizzle keeps the driver error in `cause`. */
function isDuplicateName(error: unknown): boolean {
  const cause = error instanceof Error ? error.cause : undefined;
  if (typeof cause !== "object" || cause === null) return false;
  const { code, constraint_name } = cause as { code?: unknown; constraint_name?: unknown };
  return code === "23505" && constraint_name === UNIQUE_NAME_INDEX;
}

/** Reports a duplicate name as CONFLICT with a message the form can show; rethrows the rest. */
function rethrowDuplicateName(error: unknown): never {
  throw isDuplicateName(error) ? conflict(PROJECT_NAME_TAKEN) : error;
}

export type ProjectsService = ReturnType<typeof createProjectsService>;

/**
 * Business rules for projects. A project outside the caller's organization is reported as
 * NOT_FOUND, never as FORBIDDEN, so its existence does not leak.
 */
export function createProjectsService(repository: ProjectsRepository) {
  return {
    list(organizationId: string, query: ListProjectsQuery) {
      return repository.list(organizationId, query);
    },

    async get(organizationId: string, id: string): Promise<Project> {
      const project = await repository.findById(organizationId, id);
      if (!project) throw notFound(PROJECT_NOT_FOUND);
      return project;
    },

    create(organizationId: string, input: CreateProject): Promise<Project> {
      return repository.create(organizationId, input).catch(rethrowDuplicateName);
    },

    async update(organizationId: string, id: string, input: UpdateProject): Promise<Project> {
      const project = await repository
        .update(organizationId, id, input)
        .catch(rethrowDuplicateName);
      if (!project) throw notFound(PROJECT_NOT_FOUND);
      return project;
    },

    async remove(organizationId: string, id: string): Promise<void> {
      if (!(await repository.remove(organizationId, id))) throw notFound(PROJECT_NOT_FOUND);
    },
  };
}
