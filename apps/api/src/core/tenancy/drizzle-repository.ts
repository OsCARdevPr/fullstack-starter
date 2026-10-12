import { randomUUID } from "node:crypto";
import { and, asc, count, eq } from "drizzle-orm";
import type { Database } from "../../db/client";
import { member, organization } from "../../db/schema";
import type { MembershipRecord, TenancyRepository } from "./repository";

const organizationColumns = {
  id: organization.id,
  name: organization.name,
  slug: organization.slug,
};

const membershipColumns = {
  organization: organizationColumns,
  role: member.role,
  createdAt: member.createdAt,
};

export function createTenancyRepository(db: Database): TenancyRepository {
  function selectMemberships() {
    return db
      .select(membershipColumns)
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id));
  }

  async function findOrganizationBySlug(slug: string) {
    const [row] = await db
      .select(organizationColumns)
      .from(organization)
      .where(eq(organization.slug, slug))
      .limit(1);
    return row ?? null;
  }

  return {
    findOrganizationBySlug,

    async createOrganization({ name, slug }) {
      await db
        .insert(organization)
        .values({ id: randomUUID(), name, slug })
        .onConflictDoNothing({ target: organization.slug });
      const created = await findOrganizationBySlug(slug);
      if (!created) throw new Error(`Organization "${slug}" was not found after insert.`);
      return created;
    },

    async findMembership(organizationId, userId): Promise<MembershipRecord | null> {
      const [row] = await selectMemberships()
        .where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
        .limit(1);
      return row ?? null;
    },

    async findFirstMembership(userId) {
      const [row] = await selectMemberships()
        .where(eq(member.userId, userId))
        .orderBy(asc(member.createdAt))
        .limit(1);
      return row ?? null;
    },

    async countMembers(organizationId) {
      const [row] = await db
        .select({ value: count() })
        .from(member)
        .where(eq(member.organizationId, organizationId));
      return row?.value ?? 0;
    },

    async createMembership({ organizationId, userId, role }) {
      await db
        .insert(member)
        .values({ id: randomUUID(), organizationId, userId, role })
        .onConflictDoNothing({ target: [member.organizationId, member.userId] });
    },
  };
}
