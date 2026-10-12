import type { OrganizationRole, OrganizationSummary } from "@starter/contracts";

export type OrganizationRecord = OrganizationSummary;

export interface MembershipRecord {
  organization: OrganizationRecord;
  /** Raw stored value; Better Auth allows a comma-separated list of roles. */
  role: string;
  createdAt: Date;
}

/** Persistence port for tenancy rules. Writes are idempotent so concurrent callers are safe. */
export interface TenancyRepository {
  findOrganizationBySlug(slug: string): Promise<OrganizationRecord | null>;
  /** Creates the organization, or returns the existing one when the slug is already taken. */
  createOrganization(input: { name: string; slug: string }): Promise<OrganizationRecord>;
  findMembership(organizationId: string, userId: string): Promise<MembershipRecord | null>;
  /** The user's oldest membership. */
  findFirstMembership(userId: string): Promise<MembershipRecord | null>;
  countMembers(organizationId: string): Promise<number>;
  /** Creates the membership; does nothing when the user is already a member. */
  createMembership(input: {
    organizationId: string;
    userId: string;
    role: OrganizationRole;
  }): Promise<void>;
}
