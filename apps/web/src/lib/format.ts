const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

/** A date for tables and details, in the user's locale (e.g. "Oct 11, 2026"). */
export function formatDate(value: string | Date): string {
  return dateFormat.format(typeof value === "string" ? new Date(value) : value);
}

/** Up to two initials for avatars: "Ada Lovelace" -> "AL". */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words.length > 1 ? [words[0], words.at(-1)] : words;
  return initials
    .map((word) => word?.[0] ?? "")
    .join("")
    .toUpperCase();
}
