import { describe, expect, it } from "vitest";
import { formatDate, getInitials } from "./format";

describe("getInitials", () => {
  it.each([
    ["Ada Lovelace", "AL"],
    ["Grace Brewster Murray Hopper", "GH"],
    ["  ada  ", "A"],
    ["", ""],
  ])("%j -> %j", (name, initials) => {
    expect(getInitials(name)).toBe(initials);
  });
});

describe("formatDate", () => {
  it("formats ISO strings and dates the same way", () => {
    const iso = "2026-10-11T12:00:00.000Z";
    expect(formatDate(iso)).toBe(formatDate(new Date(iso)));
    expect(formatDate(iso)).toMatch(/2026/);
  });
});
