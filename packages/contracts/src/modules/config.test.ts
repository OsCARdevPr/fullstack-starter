import { describe, expect, it } from "vitest";
import { publicConfigResponseSchema, publicConfigSchema } from "./config";

describe("publicConfigSchema", () => {
  it("parses the public runtime configuration", () => {
    const config = { tenancyMode: "multi", allowSignup: true };

    expect(publicConfigSchema.parse(config)).toEqual(config);
  });

  it("rejects an unknown tenancy mode", () => {
    const result = publicConfigSchema.safeParse({ tenancyMode: "hybrid", allowSignup: false });

    expect(result.success).toBe(false);
  });

  it("strips fields outside the contract", () => {
    const parsed = publicConfigSchema.parse({
      tenancyMode: "single",
      allowSignup: false,
      secret: "never-public",
    });

    expect(parsed).toEqual({ tenancyMode: "single", allowSignup: false });
  });

  it("is usable inside the data envelope", () => {
    const body = { data: { tenancyMode: "single", allowSignup: false } };

    expect(publicConfigResponseSchema.parse(body)).toEqual(body);
  });
});
