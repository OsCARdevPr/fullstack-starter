import { describe, expect, it } from "vitest";
import {
  idSchema,
  isoDateTimeSchema,
  searchQuerySchema,
  sortOrderSchema,
  trimmedString,
} from "./common";

describe("idSchema", () => {
  it("accepts a UUID and rejects other strings", () => {
    expect(idSchema.safeParse("0b6f9a43-6d4e-4c3a-9a8e-2f1d4b7c9e10").success).toBe(true);
    expect(idSchema.safeParse("not-a-uuid").success).toBe(false);
  });
});

describe("isoDateTimeSchema", () => {
  it("accepts Date#toISOString output and explicit offsets", () => {
    expect(isoDateTimeSchema.safeParse(new Date(0).toISOString()).success).toBe(true);
    expect(isoDateTimeSchema.safeParse("2026-10-11T12:00:00+02:00").success).toBe(true);
  });

  it("rejects dates without a time component", () => {
    expect(isoDateTimeSchema.safeParse("2026-10-11").success).toBe(false);
  });
});

describe("trimmedString", () => {
  const schema = trimmedString(2, 5);

  it("trims before checking length", () => {
    expect(schema.parse("  abc  ")).toBe("abc");
  });

  it("enforces bounds after trimming", () => {
    expect(schema.safeParse(" a ").success).toBe(false);
    expect(schema.safeParse("abcdef").success).toBe(false);
  });
});

describe("sortOrderSchema", () => {
  it("accepts asc and desc only", () => {
    expect(sortOrderSchema.parse("asc")).toBe("asc");
    expect(sortOrderSchema.parse("desc")).toBe("desc");
    expect(sortOrderSchema.safeParse("ASC").success).toBe(false);
  });
});

describe("searchQuerySchema", () => {
  it("trims the search term", () => {
    expect(searchQuerySchema.parse({ q: "  acme " })).toEqual({ q: "acme" });
  });

  it("treats missing or blank terms as no search", () => {
    expect(searchQuerySchema.parse({}).q).toBeUndefined();
    expect(searchQuerySchema.parse({ q: "   " }).q).toBeUndefined();
  });

  it("rejects terms longer than 100 characters", () => {
    expect(searchQuerySchema.safeParse({ q: "x".repeat(101) }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ q: "x".repeat(100) }).success).toBe(true);
  });
});
