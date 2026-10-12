import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { createNames, renamePath, renameTokens } from "./naming.mjs";

/** The canonical module, relative to the repository root. Directories are copied recursively. */
export const CANONICAL_SOURCES = [
  "packages/contracts/src/modules/projects.ts",
  "packages/contracts/src/modules/projects.test.ts",
  "apps/api/src/db/schema/projects.ts",
  "apps/api/src/modules/projects",
  "apps/web/src/features/projects",
  "apps/web/src/routes/_app/projects",
];

/** Sidebar icon of a generated module (lucide-react). Change it in app.config.ts afterwards. */
const NAV_ICON = "Folder";

function insertAt(source, index, text) {
  return source.slice(0, index) + text + source.slice(index);
}

function lastMatch(source, pattern) {
  return [...source.matchAll(pattern)].at(-1);
}

function assertNotRegistered(file, source, marker) {
  if (source.includes(marker)) throw new Error(`${file} already registers ${marker}.`);
}

function appendExport(file, source, specifier) {
  const line = `export * from "${specifier}";`;
  assertNotRegistered(file, source, line);
  return `${source.trimEnd()}\n${line}\n`;
}

function registerRouter(source, { plural }) {
  const file = "apps/api/src/app.ts";
  const router = `create${plural.pascal}Router`;
  assertNotRegistered(file, source, `"/api/${plural.kebab}"`);
  const lastImport = lastMatch(source, /^import [^;]+;\n/gm);
  // The last `.route()` of the chain is the one followed by `;`.
  const lastRoute = lastMatch(source, /\.route\("[^"]+", \w+\(deps\)\)(?=;)/g);
  if (!lastImport || !lastRoute) {
    throw new Error(`${file}: cannot find the imports or the .route() chain; register by hand.`);
  }
  const withRoute = insertAt(
    source,
    lastRoute.index + lastRoute[0].length,
    `\n    .route("/api/${plural.kebab}", ${router}(deps))`,
  );
  return insertAt(
    withRoute,
    lastImport.index + lastImport[0].length,
    `import { ${router} } from "./modules/${plural.kebab}";\n`,
  );
}

function registerNavItem(source, { plural }) {
  const file = "apps/web/src/config/app.config.ts";
  assertNotRegistered(file, source, `to: "/${plural.kebab}"`);
  const list = /navItems: \[[\s\S]*?(\n([ \t]*)\],)/.exec(source);
  const icons = /import \{([^}]*)\} from "lucide-react";/.exec(source);
  if (!list || !icons) {
    throw new Error(`${file}: cannot find navItems or the lucide-react import; register by hand.`);
  }
  const item = `{ label: "${plural.sentence}", to: "/${plural.kebab}", icon: ${NAV_ICON} },`;
  const closing = list.index + list[0].length - list[1].length;
  const withItem = insertAt(source, closing, `\n${list[2]}  ${item}`);

  const specifiers = icons[1].split(",").map((specifier) => specifier.trim());
  if (specifiers.includes(NAV_ICON)) return withItem;
  const imports = `import { ${[...specifiers.filter(Boolean), NAV_ICON].join(", ")} } from "lucide-react";`;
  return withItem.replace(icons[0], imports);
}

/** Files edited to register a module, with the edit. Biome sorts the inserted lines afterwards. */
const REGISTRATIONS = {
  "packages/contracts/src/index.ts": (source, { plural }) =>
    appendExport("packages/contracts/src/index.ts", source, `./modules/${plural.kebab}`),
  "apps/api/src/db/schema/index.ts": (source, { plural }) =>
    appendExport("apps/api/src/db/schema/index.ts", source, `./${plural.kebab}`),
  "apps/api/src/app.ts": registerRouter,
  "apps/web/src/config/app.config.ts": registerNavItem,
};

export const REGISTRATION_FILES = Object.keys(REGISTRATIONS);

function listFiles(root, path) {
  if (statSync(join(root, path)).isFile()) return [path];
  return readdirSync(join(root, path), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(root, join(entry.parentPath, entry.name)))
    .sort();
}

/**
 * Clones the canonical `projects` module as `name` (plural, kebab-case) and registers it.
 * Everything is computed before the first write, so a refusal leaves the repository untouched.
 */
export function generateModule({ root, name, singular, dryRun = false }) {
  const names = createNames(name, singular);
  const files = CANONICAL_SOURCES.flatMap((path) => listFiles(root, path)).map((source) => ({
    target: renamePath(source, names),
    content: renameTokens(readFileSync(join(root, source), "utf8"), names),
  }));

  const targets = [
    ...CANONICAL_SOURCES.map((path) => renamePath(path, names)),
    ...files.map((file) => file.target),
  ];
  const taken = targets.find((path) => existsSync(join(root, path)));
  if (taken) throw new Error(`Module "${name}" already exists: ${taken}`);

  const registrations = REGISTRATION_FILES.map((path) => ({
    target: path,
    content: REGISTRATIONS[path](readFileSync(join(root, path), "utf8"), names),
  }));

  if (!dryRun) {
    for (const { target, content } of [...files, ...registrations]) {
      mkdirSync(dirname(join(root, target)), { recursive: true });
      writeFileSync(join(root, target), content);
    }
  }
  return {
    names,
    created: files.map((file) => file.target),
    updated: registrations.map((file) => file.target),
  };
}
