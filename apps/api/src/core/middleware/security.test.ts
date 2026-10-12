import { apiErrorBodySchema } from "@starter/contracts";
import { describe, expect, it } from "vitest";
import { createBareApp } from "../../test/bare-app";
import { limitBody } from "./security";

describe("limitBody", () => {
  const app = createBareApp()
    .use(limitBody(16))
    .post("/echo", async (c) => c.text(await c.req.text()));

  const post = (body: string) =>
    app.request("/echo", {
      method: "POST",
      headers: { "content-type": "text/plain", "content-length": String(body.length) },
      body,
    });

  it("lets bodies within the limit through", async () => {
    const response = await post("x".repeat(16));

    expect(response.status).toBe(200);
  });

  it("answers 413 PAYLOAD_TOO_LARGE with the limit, like nginx does", async () => {
    const response = await post("x".repeat(17));
    const { error } = apiErrorBodySchema.parse(await response.json());

    expect(response.status).toBe(413);
    expect(error).toMatchObject({ code: "PAYLOAD_TOO_LARGE", details: { maxBytes: 16 } });
  });
});
