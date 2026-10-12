import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./schemas";

describe("safeRedirectPath", () => {
  it("keeps paths inside the app", () => {
    expect(safeRedirectPath("/projects?page=2")).toBe("/projects?page=2");
  });

  it.each([
    undefined,
    "",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
  ])("falls back to / for %s", (value) => {
    expect(safeRedirectPath(value)).toBe("/");
  });
});
