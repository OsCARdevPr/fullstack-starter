// pnpm gen:module <name> [--singular <word>] [--dry-run]
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { generateModule } from "./generate.mjs";

const USAGE = `Usage: pnpm gen:module <name> [--singular <word>] [--dry-run]

Creates a feature module by copying the canonical "projects" module (contracts, database
schema, API module, web feature and route, with their tests) and registers it in
packages/contracts/src/index.ts, apps/api/src/db/schema/index.ts, apps/api/src/app.ts and
apps/web/src/config/app.config.ts.

Arguments:
  <name>              Plural name in kebab-case, e.g. invoices or purchase-orders.

Options:
  --singular <word>   Singular in kebab-case when it cannot be inferred
                      (default: "ies" -> "y", otherwise the trailing "s" is dropped).
  --dry-run           Print what would be created and registered, without writing.
  -h, --help          Show this help.`;

const root = join(import.meta.dirname, "..", "..");

/** Formats the written files and sorts the inserted imports and exports, like `pnpm check`. */
function format(paths) {
  const result = spawnSync("pnpm", ["exec", "biome", "check", "--write", ...paths], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.warn(
      `\nBiome could not format every file. Run \`pnpm check\` and fix what it reports.`,
    );
    console.warn((result.stdout + result.stderr).trim());
  }
}

function nextSteps(kebab) {
  return `Next steps:
  1. Adjust the fields in packages/contracts/src/modules/${kebab}.ts (schemas) and
     apps/api/src/db/schema/${kebab}.ts (table), then in the repository, form, columns and tests.
  2. pnpm db:generate --name ${kebab}   (creates the migration; review the SQL, then pnpm db:migrate)
  3. pnpm --filter @starter/web build   (regenerates the route tree for /${kebab})
  4. pnpm verify`;
}

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      singular: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return;
  }
  if (positionals.length !== 1) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }

  const dryRun = values["dry-run"];
  const result = generateModule({ root, name: positionals[0], singular: values.singular, dryRun });
  const { plural, singular } = result.names;

  console.log(
    `${dryRun ? "Dry run, nothing written. Would create" : "Created"} module "${plural.kebab}" (singular "${singular.kebab}"):`,
  );
  for (const path of result.created) console.log(`  + ${path}`);
  console.log(dryRun ? "Would register it in:" : "Registered it in:");
  for (const path of result.updated) console.log(`  ~ ${path}`);
  if (dryRun) return;

  format([...result.created, ...result.updated]);
  console.log(`\n${nextSteps(plural.kebab)}`);
}

try {
  main();
} catch (error) {
  console.error(`gen:module: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
