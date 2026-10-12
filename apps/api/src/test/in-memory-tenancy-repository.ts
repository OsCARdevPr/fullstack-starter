import type { OrganizationRole } from "@starter/contracts";
import type {
  MembershipRecord,
  OrganizationRecord,
  TenancyRepository,
} from "../core/tenancy/repository";

interface StoredMember {
  organizationId: string;
  userId: string;
  role: string;
  createdAt: Date;
}

/** In-memory TenancyRepository with the same idempotency guarantees as the Drizzle one. */
export class InMemoryTenancyRepository implements TenancyRepository {
  readonly organizations: OrganizationRecord[] = [];
  readonly members: StoredMember[] = [];
  #clock = 0;

  async findOrganizationBySlug(slug: string) {
    return this.organizations.find((organization) => organization.slug === slug) ?? null;
  }

  async createOrganization(input: { name: string; slug: string }) {
    const existing = await this.findOrganizationBySlug(input.slug);
    if (existing) return existing;
    const organization = { id: `org-${this.organizations.length + 1}`, ...input };
    this.organizations.push(organization);
    return organization;
  }

  async findMembership(organizationId: string, userId: string) {
    const member = this.members.find(
      (candidate) => candidate.organizationId === organizationId && candidate.userId === userId,
    );
    return member ? this.#toRecord(member) : null;
  }

  async findFirstMembership(userId: string) {
    const [first] = this.members
      .filter((member) => member.userId === userId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return first ? this.#toRecord(first) : null;
  }

  async countMembers(organizationId: string) {
    return this.members.filter((member) => member.organizationId === organizationId).length;
  }

  async createMembership(input: {
    organizationId: string;
    userId: string;
    role: OrganizationRole;
  }) {
    if (await this.findMembership(input.organizationId, input.userId)) return;
    this.addMember(input);
  }

  /** Test helper: stores a membership with any raw role string, including unknown roles. */
  addMember(input: { organizationId: string; userId: string; role: string }) {
    this.#clock += 1;
    this.members.push({ ...input, createdAt: new Date(this.#clock * 1000) });
  }

  /** Test helper: stores an organization with a fixed id. */
  addOrganization(organization: OrganizationRecord) {
    this.organizations.push(organization);
    return organization;
  }

  #toRecord(member: StoredMember): MembershipRecord {
    const organization = this.organizations.find(({ id }) => id === member.organizationId);
    if (!organization) throw new Error(`Unknown organization ${member.organizationId}`);
    return { organization, role: member.role, createdAt: member.createdAt };
  }
}
