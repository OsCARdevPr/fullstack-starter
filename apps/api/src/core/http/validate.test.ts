import { apiErrorBodySchema } from "@starter/contracts";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createBareApp } from "../../test/bare-app";
import { ok } from "./responses";
import { validate } from "./validate";

const bodySchema = z.object({ name: z.string().trim().min(2), tags: z.array(z.string()).max(2) });
const querySchema = z.object({ page: z.coerce.number().int().min(1) });

function createApp() {
  return createBareApp()
    .post("/items", validate("json", bodySchema), (c) => ok(c, c.req.valid("json"), 201))
    .get("/items", validate("query", querySchema), (c) => ok(c, c.req.valid("query")));
}

function postJson(body: unknown) {
  return createApp().request("/items", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("validate", () => {
  it("passes the parsed (transformed) value to the handler", async () => {
    const response = await postJson({ name: "  Ada  ", tags: [] });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: { name: "Ada", tags: [] } });
  });

  it("responds 422 VALIDATION_ERROR with field errors keyed by field name", async () => {
    const response = await postJson({ name: "A", tags: ["a", "b", "c"] });
    const body = apiErrorBodySchema.parse(await response.json());

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.requestId).toBe(response.headers.get("x-request-id"));
    expect(body.error.details).toEqual({
      formErrors: [],
      fieldErrors: {
        name: [expect.any(String)],
        tags: [expect.any(String)],
      },
    });
  });

  it("reports a non-object body as a form error", async () => {
    const response = await postJson(["not", "an", "object"]);
    const body = apiErrorBodySchema.parse(await response.json());

    expect(response.status).toBe(422);
    expect(body.error.details).toEqual({ formErrors: [expect.any(String)], fieldErrors: {} });
  });

  it("validates query strings with coercion", async () => {
    const valid = await createApp().request("/items?page=2");
    expect(await valid.json()).toEqual({ data: { page: 2 } });

    const invalid = await createApp().request("/items?page=0");
    expect(invalid.status).toBe(422);
  });
});
