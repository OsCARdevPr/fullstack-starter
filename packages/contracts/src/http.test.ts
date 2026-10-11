import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  buildPaginationMeta,
  dataEnvelope,
  paginatedEnvelope,
  paginationMetaSchema,
  paginationQuerySchema,
  toOffset,
} from "./http";

describe("paginationQuerySchema", () => {
  it("applies defaults when values are missing", () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it("coerces query-string values to numbers", () => {
    expect(paginationQuerySchema.parse({ page: "3", pageSize: "50" })).toEqual({
      page: 3,
      pageSize: 50,
    });
  });

  it("accepts the bounds", () => {
    expect(paginationQuerySchema.parse({ page: "1", pageSize: "1" })).toEqual({
      page: 1,
      pageSize: 1,
    });
    expect(paginationQuerySchema.parse({ pageSize: "100" }).pageSize).toBe(100);
  });

  it.each([
    [{ page: "0" }],
    [{ page: "-1" }],
    [{ page: "1.5" }],
    [{ page: "abc" }],
    [{ pageSize: "0" }],
    [{ pageSize: "101" }],
  ])("rejects out-of-range or non-integer input %j", (input) => {
    expect(paginationQuerySchema.safeParse(input).success).toBe(false);
  });
});

describe("buildPaginationMeta", () => {
  it("computes total pages, rounding up", () => {
    expect(buildPaginationMeta({ total: 41, page: 2, pageSize: 20 })).toEqual({
      page: 2,
      pageSize: 20,
      total: 41,
      totalPages: 3,
    });
  });

  it("returns an exact page count when total is a multiple of pageSize", () => {
    expect(buildPaginationMeta({ total: 40, page: 1, pageSize: 20 }).totalPages).toBe(2);
  });

  it("returns zero pages for an empty result set", () => {
    expect(buildPaginationMeta({ total: 0, page: 1, pageSize: 20 })).toEqual({
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it("produces meta that satisfies paginationMetaSchema", () => {
    const meta = buildPaginationMeta({ total: 5, page: 1, pageSize: 2 });
    expect(paginationMetaSchema.parse(meta)).toEqual(meta);
  });

  it("rejects invalid arguments instead of returning Infinity or negatives", () => {
    expect(() => buildPaginationMeta({ total: 10, page: 1, pageSize: 0 })).toThrow(RangeError);
    expect(() => buildPaginationMeta({ total: -1, page: 1, pageSize: 20 })).toThrow(RangeError);
  });
});

describe("toOffset", () => {
  it("converts 1-based pages to a row offset", () => {
    expect(toOffset({ page: 1, pageSize: 20 })).toBe(0);
    expect(toOffset({ page: 3, pageSize: 25 })).toBe(50);
  });
});

describe("envelopes", () => {
  const itemSchema = z.object({ id: z.string() });

  it("dataEnvelope wraps a schema under data", () => {
    const schema = dataEnvelope(itemSchema);
    expect(schema.parse({ data: { id: "a" } })).toEqual({ data: { id: "a" } });
    expect(schema.safeParse({ id: "a" }).success).toBe(false);
  });

  it("paginatedEnvelope requires an item array and meta", () => {
    const schema = paginatedEnvelope(itemSchema);
    const body = {
      data: [{ id: "a" }, { id: "b" }],
      meta: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
    };
    expect(schema.parse(body)).toEqual(body);
    expect(schema.safeParse({ data: [{ id: "a" }] }).success).toBe(false);
    expect(schema.safeParse({ ...body, data: [{ id: 1 }] }).success).toBe(false);
  });
});
