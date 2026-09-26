import { format } from "date-fns";

/**
 * Shared value formatters for detail modals.
 *
 * Every formatter is null-safe and returns `null` for "no data" so that
 * {@link DetailField} can render a consistent em-dash placeholder and admins
 * can tell "not collected" apart from a real value.
 */

/** snake_case / kebab-case → Title Case. Returns null for empty input. */
export function humanize(value?: string | null): string | null {
  if (!value) return null;
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Join a string array into a humanized, comma-separated list. */
export function list(value?: string[] | null): string | null {
  if (!value || value.length === 0) return null;
  return value.map((v) => humanize(v) || v).join(", ");
}

/** Locale-formatted number, or null when absent. */
export function num(value?: number | null): string | null {
  if (value === null || value === undefined) return null;
  return value.toLocaleString();
}

/** Format an ISO date string; null-safe. `withTime` appends HH:mm. */
export function fmtDate(value?: string | null, withTime = false): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return format(d, withTime ? "MMM dd, yyyy HH:mm" : "MMM dd, yyyy");
}

/** Up-to-two-letter initials for an avatar; "?" when unknown. */
export function initials(name?: string | null): string {
  if (!name || name === "—") return "?";
  const parts = name.split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}
