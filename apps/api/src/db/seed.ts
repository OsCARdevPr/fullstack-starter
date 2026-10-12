/**
 * Idempotent seed: `pnpm db:seed` (after `pnpm db:migrate`).
 * Creates the default organization, the platform admin from SEED_ADMIN_* as its owner, and sample
 * projects when the organization has none. Running it again changes nothing.
 */
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CreateProject } from "@starter/contracts";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  type Env,
  type EnvIssue,
  type EnvSource,
  EnvValidationError,
  parseEnv,
} from "../config/env";
import { createTenancyRepository, createTenancyService } from "../core/tenancy";
import { type Auth, createAuth } from "../lib/auth";
import { createLogger } from "../lib/logger";
import { createProjectsRepository } from "../modules/projects/repository";
import { createDatabase, type Database } from "./client";
import { member, user } from "./schema";

const seedEnvSchema = z.object({
  SEED_ADMIN_EMAIL: z.email(),
  // Same bounds as sign-in (lib/auth.ts), which the admin create-user endpoint does not enforce.
  SEED_ADMIN_PASSWORD: z.string().min(12, "must be at least 12 characters").max(128),
  SEED_ADMIN_NAME: z.string().trim().min(1).default("Administrator"),
});

const SAMPLE_PROJECTS: CreateProject[] = [
  {
    name: "Website redesign",
    description: "Refresh the marketing site with the new brand.",
    status: "active",
  },
  { name: "Mobile app", description: "First release of the customer app.", status: "active" },
  { name: "Legacy migration", description: null, status: "archived" },
];

export interface SeedAdmin {
  email: string;
  password: string;
  name: string;
}

export interface SeedDeps {
  db: Database;
  auth: Auth;
  env: Pick<Env, "DEFAULT_ORG_NAME" | "DEFAULT_ORG_SLUG">;
}

export interface SeedSummary {
  organization: { name: string; slug: string; created: boolean };
  admin: { email: string; created: boolean };
  sampleProjects: number;
}

export async function seedDatabase(
  { db, auth, env }: SeedDeps,
  admin: SeedAdmin,
): Promise<SeedSummary> {
  const tenancyRepository = createTenancyRepository(db);
  const existingOrganization = await tenancyRepository.findOrganizationBySlug(env.DEFAULT_ORG_SLUG);
  const organization =
    existingOrganization ??
    (await tenancyRepository.createOrganization({
      name: env.DEFAULT_ORG_NAME,
      slug: env.DEFAULT_ORG_SLUG,
    }));

  const email = admin.email.toLowerCase();
  const [existingAdmin] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  // The admin plugin's server-side create-user works even when public sign-up is disabled.
  const adminId =
    existingAdmin?.id ??
    (
      await auth.api.createUser({
        body: { email, password: admin.password, name: admin.name, role: "admin" },
      })
    ).user.id;

  // In single mode the user hook may already have added the admin as a member: promote it.
  await db
    .insert(member)
    .values({ id: randomUUID(), organizationId: organization.id, userId: adminId, role: "owner" })
    .onConflictDoUpdate({ target: [member.organizationId, member.userId], set: { role: "owner" } });

  const projectsRepository = createProjectsRepository(db);
  const { total } = await projectsRepository.list(organization.id, { page: 1, pageSize: 1 });
  const sampleProjects = total === 0 ? SAMPLE_PROJECTS : [];
  for (const project of sampleProjects) await projectsRepository.create(organization.id, project);

  return {
    organization: {
      name: organization.name,
      slug: organization.slug,
      created: !existingOrganization,
    },
    admin: { email, created: !existingAdmin },
    sampleProjects: sampleProjects.length,
  };
}

/** Validates the app env and the SEED_ADMIN_* variables, reporting every problem at once. */
export function readSeedEnv(source: EnvSource) {
  const issues: EnvIssue[] = [];
  let env: Env | undefined;
  try {
    env = parseEnv(source);
  } catch (error) {
    if (!(error instanceof EnvValidationError)) throw error;
    issues.push(...error.issues);
  }

  const present = Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ""));
  const seed = seedEnvSchema.safeParse(present);
  if (!seed.success) {
    issues.push(
      ...seed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    );
  }

  if (!env || !seed.success) throw new EnvValidationError(issues);
  const admin: SeedAdmin = {
    email: seed.data.SEED_ADMIN_EMAIL,
    password: seed.data.SEED_ADMIN_PASSWORD,
    name: seed.data.SEED_ADMIN_NAME,
  };
  return { env, admin };
}

function formatSummary({ organization, admin, sampleProjects }: SeedSummary) {
  const state = (created: boolean) => (created ? "created" : "already existed");
  return [
    "Seed complete:",
    `  organization     ${organization.name} (${organization.slug}): ${state(organization.created)}`,
    `  admin            ${admin.email}: ${state(admin.created)}`,
    `  sample projects  ${sampleProjects > 0 ? `${sampleProjects} created` : "none added"}`,
  ].join("\n");
}

async function main() {
  const { env, admin } = readSeedEnv(process.env);
  const logger = createLogger({ level: "warn", pretty: false });
  const { client, db } = createDatabase(env.DATABASE_URL, { max: 1 });
  const tenancy = createTenancyService({
    repository: createTenancyRepository(db),
    mode: env.TENANCY_MODE,
    defaultOrganization: { name: env.DEFAULT_ORG_NAME, slug: env.DEFAULT_ORG_SLUG },
  });
  const auth = createAuth({ env, db, tenancy, logger });

  try {
    console.log(formatSummary(await seedDatabase({ db, auth, env }, admin)));
  } finally {
    await client.end({ timeout: 5 });
  }
}

// Run only when executed as a script (`tsx src/db/seed.ts`), not when imported by tests.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof EnvValidationError ? error.message : error);
    process.exit(1);
  });
}
