import { cn } from "@/lib/utils";

/**
 * Pill renderers for the Period tables.
 *
 * The old labeledPill hashed a value into one of
 * ["bg","bbl","bpu","bt","by","br"] -- but only `.b`, `.bg` and `.br` are
 * actually defined in app/globals.css. `.bbl`, `.bpu`, `.bt` and `.by` have
 * no rule at all, so those branches rendered a bare `.b` with no background
 * and the hash made `.bg` (green) the only colour anyone ever noticed. That
 * is why every Topic cell looked green.
 *
 * Rather than add four more colour rules and keep hashing arbitrary strings
 * into them, these pills commit to a small deliberate set. Colour here means
 * something; it is not a hash of the label.
 */

const BASE = "b whitespace-nowrap text-[10px]! leading-none";

/** High-contrast: dark in light mode, inverted in dark mode. For Topic. */
export function darkPill(value: unknown, fallback = "—") {
  const label = format(value, fallback);
  return (
    <span
      className={cn(
        BASE,
        "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
      )}
    >
      {label}
    </span>
  );
}

/** Quiet grey pill. For Origin and Type -- metadata, not status. */
export function neutralPill(value: unknown, fallback = "—") {
  const label = format(value, fallback);
  return (
    <span
      className={cn(
        BASE,
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      )}
    >
      {label}
    </span>
  );
}

function format(value: unknown, fallback: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  return raw.replaceAll("_", " ");
}
