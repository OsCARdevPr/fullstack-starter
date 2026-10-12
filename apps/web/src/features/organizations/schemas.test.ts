import { describe, expect, it } from "vitest";
import { organizationSlug } from "./schemas";

describe("organizationSlug", () => {
  it("turns the name into kebab case with a random suffix", () => {
    expect(organizationSlug("Café Ñandú, Inc.")).toMatch(/^cafe-nandu-inc-[0-9a-f]{6}$/);
  });

  it("gives different slugs for the same name", () => {
    expect(organizationSlug("Acme")).not.toBe(organizationSlug("Acme"));
  });

  it("falls back to the suffix when the name has no usable characters", () => {
    expect(organizationSlug("***")).toMatch(/^[0-9a-f]{6}$/);
  });
});
