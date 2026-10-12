import { describe, expect, it } from "vitest";
import { meResponseSchema, meSchema, organizationRoleSchema, tenancyModeSchema } from "./me";

const validMe = {
  user: {
    id: "usr_Kx81mZ2pQ",
    name: "Ada Lovelace",
    email: "ada@example.com",
    emailVerified: true,
    image: null,
    role: "admin",
  },
  organization: { id: "org_Kx81mZ2pQ", name: "Acme", slug: "acme" },
  role: "owner",
  tenancyMode: "single",
};

describe("meSchema", () => {
  it("parses a user with an active organization", () => {
    expect(meSchema.parse(validMe)).toEqual(validMe);
  });

  it("accepts a user without an active organization", () => {
    const withoutOrganization = { ...validMe, organization: null, role: null };
    expect(meSchema.parse(withoutOrganization)).toEqual(withoutOrganization);
  });

  it("rejects an unknown platform role", () => {
    const result = meSchema.safeParse({ ...validMe, user: { ...validMe.user, role: "root" } });
    expect(result.success).toBe(false);
  });

  it("is usable inside the data envelope", () => {
    expect(meResponseSchema.parse({ data: validMe })).toEqual({ data: validMe });
  });
});

describe("role and tenancy enums", () => {
  it("lists organization roles from highest to lowest privilege", () => {
    expect(organizationRoleSchema.options).toEqual(["owner", "admin", "member"]);
  });

  it("only allows single and multi tenancy modes", () => {
    expect(tenancyModeSchema.safeParse("single").success).toBe(true);
    expect(tenancyModeSchema.safeParse("hybrid").success).toBe(false);
  });
});
