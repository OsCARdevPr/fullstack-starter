import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createProjectSchema,
  listProjectsQuerySchema,
  projectListResponseSchema,
  projectSchema,
  updateProjectSchema,
} from "./projects";

const validProject = {
  id: "0b6f9a43-6d4e-4c3a-9a8e-2f1d4b7c9e10",
  organizationId: "org_Kx81mZ2pQ",
  name: "Website redesign",
  description: null,
  status: "active",
  createdAt: "2026-10-11T12:00:00.000Z",
  updatedAt: "2026-10-11T12:00:00.000Z",
};

describe("projectSchema", () => {
  it("parses a project with a non-UUID organization id", () => {
    expect(projectSchema.parse(validProject)).toEqual(validProject);
  });

  it("rejects an unknown status", () => {
    expect(projectSchema.safeParse({ ...validProject, status: "deleted" }).success).toBe(false);
  });

  it("is usable inside the paginated response envelope", () => {
    const body = {
      data: [validProject],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    expect(projectListResponseSchema.parse(body)).toEqual(body);
  });
});

describe("createProjectSchema", () => {
  it("trims the name and defaults status to active", () => {
    expect(createProjectSchema.parse({ name: "  Launch  " })).toEqual({
      name: "Launch",
      status: "active",
    });
  });

  it("enforces name length bounds after trimming", () => {
    expect(createProjectSchema.safeParse({ name: " a " }).success).toBe(false);
    expect(createProjectSchema.safeParse({ name: "ab" }).success).toBe(true);
    expect(createProjectSchema.safeParse({ name: "x".repeat(120) }).success).toBe(true);
    expect(createProjectSchema.safeParse({ name: "x".repeat(121) }).success).toBe(false);
  });

  it("normalizes a blank description to null", () => {
    expect(createProjectSchema.parse({ name: "Launch", description: "   " }).description).toBe(
      null,
    );
  });

  it("rejects a description longer than 2000 characters", () => {
    const result = createProjectSchema.safeParse({ name: "Launch", description: "x".repeat(2001) });
    expect(result.success).toBe(false);
  });

  it("reports field errors in the validation details shape", () => {
    const result = createProjectSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(z.flattenError(result.error).fieldErrors.name?.length).toBeGreaterThan(0);
  });
});

describe("updateProjectSchema", () => {
  it("accepts a single field without injecting defaults", () => {
    expect(updateProjectSchema.parse({ name: " Renamed " })).toEqual({ name: "Renamed" });
  });

  it("allows clearing the description with null", () => {
    expect(updateProjectSchema.parse({ description: null })).toEqual({ description: null });
  });

  it.each([[{}], [{ name: undefined }]])(
    "requires at least one defined field (%j) as a form-level error",
    (input) => {
      const result = updateProjectSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(z.flattenError(result.error).formErrors).toEqual([
        "Provide at least one field to update.",
      ]);
    },
  );

  it("still validates the provided fields", () => {
    expect(updateProjectSchema.safeParse({ name: "x" }).success).toBe(false);
    expect(updateProjectSchema.safeParse({ status: "deleted" }).success).toBe(false);
  });
});

describe("listProjectsQuerySchema", () => {
  it("applies pagination defaults and leaves filters undefined", () => {
    expect(listProjectsQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it("parses query-string filters", () => {
    expect(
      listProjectsQuerySchema.parse({
        page: "2",
        pageSize: "10",
        q: " web ",
        status: "archived",
        sort: "name",
        order: "asc",
      }),
    ).toEqual({ page: 2, pageSize: 10, q: "web", status: "archived", sort: "name", order: "asc" });
  });

  it("rejects unknown sort fields", () => {
    expect(listProjectsQuerySchema.safeParse({ sort: "organizationId" }).success).toBe(false);
  });
});
