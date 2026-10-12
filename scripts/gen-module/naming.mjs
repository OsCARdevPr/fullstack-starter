// Naming rules of the module generator. The canonical module is `projects` (singular `project`);
// every occurrence is renamed with the casing its context needs.

const NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** One match per occurrence: RPC access, then each casing (plural before singular). */
const TOKEN = /\bapi\.projects\b|PROJECTS|PROJECT|Projects|Project|projects|project/g;

/** Words that can sit right before or after an identifier in code, so they do not signal prose. */
const CODE_WORDS = new Set([
  "as",
  "await",
  "case",
  "const",
  "delete",
  "export",
  "extends",
  "from",
  "import",
  "in",
  "instanceof",
  "keyof",
  "let",
  "new",
  "of",
  "return",
  "satisfies",
  "throw",
  "type",
  "typeof",
  "var",
  "void",
  "yield",
]);

/** Plural to singular: `ies` -> `y`, otherwise drop the trailing `s`. Null when neither applies. */
export function inferSingular(plural) {
  if (plural.endsWith("ies")) return `${plural.slice(0, -3)}y`;
  if (plural.endsWith("s")) return plural.slice(0, -1);
  return null;
}

const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);

/** Every casing of a kebab-case name. */
function casings(kebab) {
  const words = kebab.split("-");
  const pascal = words.map(capitalize).join("");
  return {
    kebab,
    camel: pascal.charAt(0).toLowerCase() + pascal.slice(1),
    pascal,
    snake: words.join("_"),
    constant: words.join("_").toUpperCase(),
    words: words.join(" "),
    sentence: capitalize(words.join(" ")),
  };
}

/** Validates the module name and returns the plural and singular casings. */
export function createNames(plural, singular = inferSingular(plural)) {
  if (!NAME_PATTERN.test(plural)) {
    throw new Error(
      `Invalid name "${plural}": use the plural in kebab-case, e.g. invoices or purchase-orders.`,
    );
  }
  if (!singular) {
    throw new Error(`Cannot infer the singular of "${plural}": pass --singular <word>.`);
  }
  if (!NAME_PATTERN.test(singular)) {
    throw new Error(`Invalid singular "${singular}": use kebab-case, e.g. purchase-order.`);
  }
  if (singular === plural) {
    throw new Error(
      `The singular must differ from the plural "${plural}": pass --singular <word>.`,
    );
  }
  return { plural: casings(plural), singular: casings(singular) };
}

function isComment(before) {
  const line = before.slice(before.lastIndexOf("\n") + 1);
  return /^\s*(\/\/|\/?\*)/.test(line) || /\s\/\/\s/.test(line);
}

/** Member access, call, index, type annotation, assignment, JSX prop or list separator. */
function isFollowedByCode(after) {
  return /^(?:\??\.[A-Za-z_$]|\?:|[=([:;,)\]}<>!])/.test(after);
}

/** A word of text (not a code keyword) right before or right after the token. */
function isProse(before, after) {
  const previous = /([A-Za-z']+) $/.exec(before)?.[1];
  const next = /^ ([A-Za-z]+)/.exec(after)?.[1];
  return [previous, next].some((word) => word !== undefined && !CODE_WORDS.has(word));
}

/**
 * Renames every `projects` / `project` token in `source` for the context it appears in:
 * - file paths and URLs (after `/`) and quoted keys like `["projects"]`: kebab-case;
 * - SQL table, index and enum names (`pgTable("projects"`, `projects_..._idx`): snake_case;
 * - identifiers: camelCase, PascalCase or SCREAMING_SNAKE_CASE, following the original;
 * - text in strings, JSX and comments: lower-case words ("New purchase order");
 * - the RPC client: `api.projects` -> `api["purchase-orders"]` when the path is not an identifier.
 * One regex pass, so a new name that contains "project" is never renamed twice.
 */
export function renameTokens(source, names) {
  return source.replace(TOKEN, (match, offset) => {
    const { plural, singular } = names;
    if (match.startsWith("api.")) {
      return plural.kebab === plural.camel ? `api.${plural.camel}` : `api["${plural.kebab}"]`;
    }

    const form = /s$/i.test(match) ? plural : singular;
    const before = source.slice(0, offset);
    const after = source.slice(offset + match.length);
    const joinedBefore = /[A-Za-z0-9]$/.test(before);
    const joinedAfter = /^[A-Za-z0-9]/.test(after);
    const quoted = before.endsWith('"') && after.startsWith('"');

    if (match === match.toUpperCase()) return form.constant;

    if (match.startsWith("P")) {
      if (joinedBefore || joinedAfter) return form.pascal;
      if (isComment(before) || quoted) return form.sentence;
      if (isFollowedByCode(after)) return form.pascal;
      return isProse(before, after) ? form.sentence : form.pascal;
    }

    // Lower case from here on.
    if (joinedBefore || /^[a-z0-9]/.test(after)) return match; // part of another word
    if (before.endsWith("/")) return form.kebab;
    if (after.startsWith("_") || /pgTable\(\s*"$/.test(before)) return form.snake;
    if (/^[A-Z]/.test(after)) return form.camel;
    if (quoted) return form.kebab;
    if (isComment(before)) return form.words;
    if (isFollowedByCode(after)) return form.camel;
    return isProse(before, after) ? form.words : form.camel;
  });
}

/** Renames file and directory names (always kebab-case). */
export function renamePath(path, names) {
  return path.replace(/projects|project/g, (match) =>
    match.endsWith("s") ? names.plural.kebab : names.singular.kebab,
  );
}
