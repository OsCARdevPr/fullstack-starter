// Pure renames for `pnpm setup:project`. Each function returns the new file content and is
// idempotent: applying it twice with the same name changes nothing the second time.

const NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** The name becomes the npm package name and the Docker Compose project name. */
export function validateProjectName(name) {
  if (!NAME_PATTERN.test(name)) {
    throw new Error(`Invalid project name "${name}": use kebab-case, e.g. acme-crm.`);
  }
}

/** "acme-crm" -> "Acme Crm": the default app name shown in the UI. */
export function toTitle(name) {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function replaceOnce(source, pattern, replacement, anchor) {
  if (!pattern.test(source)) throw new Error(`Cannot find ${anchor}.`);
  return source.replace(pattern, replacement);
}

/** Root package.json: only the top-level "name" (the first one in the file). */
export function renamePackage(source, name) {
  return replaceOnce(source, /^(\s*"name":\s*)"[^"]*"/m, `$1"${name}"`, `"name" in package.json`);
}

/** Docker Compose: the top-level `name:` keeps containers, networks and volumes apart. */
export function renameComposeProject(source, name) {
  return replaceOnce(source, /^name: .*$/m, `name: ${name}`, "a top-level `name:` in compose");
}

/** apps/web/src/config/app.config.ts: the fallback used when VITE_APP_NAME is not set. */
export function renameAppName(source, title) {
  return replaceOnce(
    source,
    /(VITE_APP_NAME\?\.trim\(\) \|\| )"(?:[^"\\]|\\.)*"/,
    (_, prefix) => `${prefix}${JSON.stringify(title)}`,
    "the VITE_APP_NAME fallback",
  );
}

/** README.md: the first level-one heading, added when there is none. */
export function renameReadmeTitle(source, title) {
  return /^# .*$/m.test(source)
    ? source.replace(/^# .*$/m, `# ${title}`)
    : `# ${title}\n\n${source}`;
}
