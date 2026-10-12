// pnpm setup:project <name> [--title "<App name>"]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import {
  renameAppName,
  renameComposeProject,
  renamePackage,
  renameReadmeTitle,
  toTitle,
  validateProjectName,
} from "./rename.mjs";

const USAGE = `Usage: pnpm setup:project <name> [--title "<App name>"]

Gives a project created from this template its own identity, so two projects on one machine
never share Docker containers, networks or volumes. Safe to run again.

Renames:
  package.json                        "name": <name>
  docker/compose.yaml                 name: <name>
  docker/compose.dev.yaml             name: <name>-dev
  apps/web/src/config/app.config.ts   default app name: <title>
  README.md (when it exists)          first heading: <title>
The internal @starter/* package names stay as they are.

Arguments:
  <name>             Project name in kebab-case, e.g. acme-crm.

Options:
  --title <text>     App name shown in the UI (default: the name in title case, "Acme Crm").
  -h, --help         Show this help.`;

const NEXT_STEPS = `Next steps:
  1. cp .env.example .env
  2. Set BETTER_AUTH_SECRET in .env to the output of: openssl rand -base64 32
  3. pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm dev`;

const root = join(import.meta.dirname, "..", "..");

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      title: { type: "string" },
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

  const [name] = positionals;
  validateProjectName(name);
  const title = values.title?.trim() || toTitle(name);
  const renames = [
    ["package.json", (source) => renamePackage(source, name)],
    ["docker/compose.yaml", (source) => renameComposeProject(source, name)],
    ["docker/compose.dev.yaml", (source) => renameComposeProject(source, `${name}-dev`)],
    ["apps/web/src/config/app.config.ts", (source) => renameAppName(source, title)],
    ["README.md", (source) => renameReadmeTitle(source, title), { optional: true }],
  ];

  // Compute every change first, so a missing anchor leaves the project untouched.
  const changes = renames.flatMap(([path, rename, options]) => {
    const file = join(root, path);
    if (options?.optional && !existsSync(file)) return [];
    const before = readFileSync(file, "utf8");
    return [{ path, file, before, after: rename(before) }];
  });

  console.log(`Project "${name}", app name "${title}":`);
  for (const { path, file, before, after } of changes) {
    const changed = after !== before;
    if (changed) writeFileSync(file, after);
    console.log(changed ? `  ~ ${path}` : `  = ${path} (unchanged)`);
  }
  console.log(`\n${NEXT_STEPS}`);
}

try {
  main();
} catch (error) {
  console.error(`setup:project: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
