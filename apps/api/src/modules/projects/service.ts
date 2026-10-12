import type { CreateProject, ListProjectsQuery, Project, UpdateProject } from "@starter/contracts";
import { notFound } from "../../core/errors";
import type { ProjectsRepository } from "./repository";

const PROJECT_NOT_FOUND = "Project not found.";

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

    create(organizationId: string, input: CreateProject) {
      return repository.create(organizationId, input);
    },

    async update(organizationId: string, id: string, input: UpdateProject): Promise<Project> {
      const project = await repository.update(organizationId, id, input);
      if (!project) throw notFound(PROJECT_NOT_FOUND);
      return project;
    },

    async remove(organizationId: string, id: string): Promise<void> {
      if (!(await repository.remove(organizationId, id))) throw notFound(PROJECT_NOT_FOUND);
    },
  };
}
