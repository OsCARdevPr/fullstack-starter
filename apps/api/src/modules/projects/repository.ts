import {
  type CreateProject,
  type ListProjectsQuery,
  type Project,
  type ProjectSortField,
  toOffset,
  type UpdateProject,
} from "@starter/contracts";
import { and, asc, desc, eq, ilike } from "drizzle-orm";
import type { Database } from "../../db/client";
import { projects } from "../../db/schema";

/**
 * Persistence port for projects. Every method takes the organization id, so a query can never
 * read or change another organization's rows.
 */
export interface ProjectsRepository {
  list(
    organizationId: string,
    query: ListProjectsQuery,
  ): Promise<{ items: Project[]; total: number }>;
  findById(organizationId: string, id: string): Promise<Project | null>;
  create(organizationId: string, input: CreateProject): Promise<Project>;
  /** Returns null when the project does not exist in the organization. */
  update(organizationId: string, id: string, input: UpdateProject): Promise<Project | null>;
  /** Returns false when the project does not exist in the organization. */
  remove(organizationId: string, id: string): Promise<boolean>;
}

type ProjectRow = typeof projects.$inferSelect;

const SORT_COLUMNS = {
  name: projects.name,
  createdAt: projects.createdAt,
  updatedAt: projects.updatedAt,
} satisfies Record<ProjectSortField, unknown>;

/** The single mapping from a database row to the API contract shape. */
export function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Matches the term literally: `%` and `_` typed by a user are not wildcards. */
function containsPattern(term: string) {
  return `%${term.replace(/[\\%_]/g, "\\$&")}%`;
}

function byId(organizationId: string, id: string) {
  return and(eq(projects.organizationId, organizationId), eq(projects.id, id));
}

export function createProjectsRepository(db: Database): ProjectsRepository {
  return {
    async list(organizationId, { page, pageSize, q, status, sort = "createdAt", order }) {
      const where = and(
        eq(projects.organizationId, organizationId),
        q ? ilike(projects.name, containsPattern(q)) : undefined,
        status ? eq(projects.status, status) : undefined,
      );
      // Default direction: names A-Z, dates newest first. The id keeps pages stable on ties.
      const direction = (order ?? (sort === "name" ? "asc" : "desc")) === "asc" ? asc : desc;

      const [rows, total] = await Promise.all([
        db
          .select()
          .from(projects)
          .where(where)
          .orderBy(direction(SORT_COLUMNS[sort]), asc(projects.id))
          .limit(pageSize)
          .offset(toOffset({ page, pageSize })),
        db.$count(projects, where),
      ]);
      return { items: rows.map(toProject), total };
    },

    async findById(organizationId, id) {
      const [row] = await db.select().from(projects).where(byId(organizationId, id)).limit(1);
      return row ? toProject(row) : null;
    },

    async create(organizationId, input) {
      const [row] = await db
        .insert(projects)
        .values({
          organizationId,
          name: input.name,
          description: input.description ?? null,
          status: input.status,
        })
        .returning();
      if (!row) throw new Error("Inserting a project returned no row.");
      return toProject(row);
    },

    async update(organizationId, id, input) {
      const [row] = await db
        .update(projects)
        .set(input)
        .where(byId(organizationId, id))
        .returning();
      return row ? toProject(row) : null;
    },

    async remove(organizationId, id) {
      const deleted = await db
        .delete(projects)
        .where(byId(organizationId, id))
        .returning({ id: projects.id });
      return deleted.length > 0;
    },
  };
}
