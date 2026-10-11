import { z } from "zod";
import {
  idSchema,
  isoDateTimeSchema,
  searchQuerySchema,
  sortOrderSchema,
  trimmedString,
} from "../common";
import { dataEnvelope, paginatedEnvelope, paginationQuerySchema } from "../http";

export const projectStatusSchema = z.enum(["active", "archived"]);

export type ProjectStatus = z.infer<typeof projectStatusSchema>;

const projectNameSchema = trimmedString(2, 120);

// Forms submit "" for an empty textarea; store that as null so there is one "no description" value.
const projectDescriptionInputSchema = z
  .string()
  .trim()
  .max(2000)
  .transform((value) => (value === "" ? null : value))
  .nullable();

export const projectSchema = z.object({
  id: idSchema,
  organizationId: z.string().min(1),
  name: projectNameSchema,
  description: z.string().max(2000).nullable(),
  status: projectStatusSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export type Project = z.infer<typeof projectSchema>;

export const createProjectSchema = z.object({
  name: projectNameSchema,
  description: projectDescriptionInputSchema.optional(),
  status: projectStatusSchema.default("active"),
});

export type CreateProjectInput = z.input<typeof createProjectSchema>;
export type CreateProject = z.output<typeof createProjectSchema>;

// Built from default-free fields: `.partial()` over a `.default()` would inject the default
// into every update and silently overwrite stored values.
export const updateProjectSchema = z
  .object({
    name: projectNameSchema,
    description: projectDescriptionInputSchema,
    status: projectStatusSchema,
  })
  .partial()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "Provide at least one field to update.",
  });

export type UpdateProjectInput = z.input<typeof updateProjectSchema>;
export type UpdateProject = z.output<typeof updateProjectSchema>;

export const projectSortFieldSchema = z.enum(["name", "createdAt", "updatedAt"]);

export type ProjectSortField = z.infer<typeof projectSortFieldSchema>;

export const listProjectsQuerySchema = z.object({
  ...paginationQuerySchema.shape,
  ...searchQuerySchema.shape,
  status: projectStatusSchema.optional(),
  sort: projectSortFieldSchema.optional(),
  order: sortOrderSchema.optional(),
});

export type ListProjectsQueryInput = z.input<typeof listProjectsQuerySchema>;
export type ListProjectsQuery = z.output<typeof listProjectsQuerySchema>;

export const projectResponseSchema = dataEnvelope(projectSchema);
export const projectListResponseSchema = paginatedEnvelope(projectSchema);
