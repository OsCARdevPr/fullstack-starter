import { paginatedEnvelope } from "@starter/contracts";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createBareApp } from "../../test/bare-app";
import { ok, paginated } from "./responses";

describe("response helpers", () => {
  it("ok wraps data in the success envelope with status 200 by default", async () => {
    const app = createBareApp().get("/", (c) => ok(c, { id: "1" }));
    const response = await app.request("/");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { id: "1" } });
  });

  it("paginated returns items with metadata built from the totals", async () => {
    const app = createBareApp().get("/", (c) =>
      paginated(c, [{ id: "1" }], { page: 2, pageSize: 1, total: 3 }),
    );
    const body = await (await app.request("/")).json();

    expect(paginatedEnvelope(z.object({ id: z.string() })).parse(body)).toEqual({
      data: [{ id: "1" }],
      meta: { page: 2, pageSize: 1, total: 3, totalPages: 3 },
    });
  });
});
