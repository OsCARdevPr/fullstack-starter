import { projectStatusSchema } from "@starter/contracts";
import { sql } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { organization } from "./auth";

// Values come from the shared contract, so the API, the web app and the database agree.
export const projectStatus = pgEnum("project_status", projectStatusSchema.enum);

/** Tenant-owned table: every row belongs to one organization and every query filters by it. */
export const projects = pgTable(
  "projects",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text().notNull(),
    description: text(),
    status: projectStatus().notNull().default("active"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (table) => [
    index("projects_organization_id_idx").on(table.organizationId),
    // Duplicate names inside one organization surface as 409 CONFLICT via the Postgres mapper.
    uniqueIndex("projects_organization_id_name_uidx").on(table.organizationId, table.name),
  ],
);
