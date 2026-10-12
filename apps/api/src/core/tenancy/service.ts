import type { OrganizationRole, TenancyMode } from "@starter/contracts";
import type { OrganizationRecord, TenancyRepository } from "./repository";
import { toOrganizationRole } from "./roles";

export interface Membership {
  organization: OrganizationRecord;
  role: OrganizationRole;
}

export interface TenancyServiceOptions {
  repository: TenancyRepository;
  mode: TenancyMode;
  defaultOrganization: { name: string; slug: string };
}

export type TenancyService = ReturnType<typeof createTenancyService>;

export function createTenancyService({
  repository,
  mode,
  defaultOrganization,
}: TenancyServiceOptions) {
  /**
   * Single mode: makes the user a member of the default organization, creating it when missing.
   * The first member becomes its owner. Safe to call repeatedly.
   */
  async function ensureDefaultMembership(userId: string): Promise<OrganizationRecord> {
    const organization =
      (await repository.findOrganizationBySlug(defaultOrganization.slug)) ??
      (await repository.createOrganization(defaultOrganization));

    if (await repository.findMembership(organization.id, userId)) return organization;

    const role = (await repository.countMembers(organization.id)) === 0 ? "owner" : "member";
    await repository.createMembership({ organizationId: organization.id, userId, role });
    return organization;
  }

  /** Organization to activate for a new session: the default one (single) or the oldest (multi). */
  async function resolveActiveOrganizationId(userId: string): Promise<string | null> {
    if (mode === "single") return (await ensureDefaultMembership(userId)).id;
    return (await repository.findFirstMembership(userId))?.organization.id ?? null;
  }

  /** Membership with a known role, or null. Unknown roles deny access (fail closed). */
  async function findMembership(
    organizationId: string,
    userId: string,
  ): Promise<Membership | null> {
    const record = await repository.findMembership(organizationId, userId);
    const role = toOrganizationRole(record?.role);
    return record && role ? { organization: record.organization, role } : null;
  }

  return { mode, ensureDefaultMembership, resolveActiveOrganizationId, findMembership };
}
