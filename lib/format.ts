/**
 * Shared numeric formatting for KPI cards, tables and exports (Gap Analysis
 * Part S — the "value contract"). One convention everywhere: en-GH digit
 * grouping, tabular alignment in the UI (apply `tabular-nums`), compact
 * notation only when a value would overflow a card column — never truncate
 * digits, never fake data.
 */

const GROUPED = new Intl.NumberFormat("en-GH");
const COMPACT = new Intl.NumberFormat("en-GH", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** The Ghana cedi sign. One spelling, so the UI cannot drift between forms. */
export const CEDI = "\u20B5";

export interface KpiValueOptions {
  /** Compact notation (12.4K) when the number exceeds the safe width. */
  compact?: boolean;
  /** Threshold above which compact notation kicks in (default 10,000). */
  compactAbove?: number;
  /** Prefix the Ghana cedi symbol. */
  currency?: boolean;
}

export function formatKpiValue(
  value: number | string | null | undefined,
  opts: KpiValueOptions = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";

  // Pre-formatted strings (dates, ratios like "94.2%", statuses) pass through.
  if (typeof value === "string") return value.trim() === "" ? "—" : value;

  const { compact = false, compactAbove = 10_000, currency = false } = opts;
  const useCompact = compact && Math.abs(value) >= compactAbove;
  const formatted = useCompact ? COMPACT.format(value) : GROUPED.format(value);
  return currency ? `₵${formatted}` : formatted;
}

/** Percentage helper: null-safe, fixed decimals, "—" when unknown. */
export function formatKpiPercent(
  value: number | null | undefined,
  decimals = 0,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(decimals)}%`;
}

/**
 * Money. One cedi formatter for the whole admin panel.
 *
 * This replaces ~26 hand-rolled `₵${Number(x).toLocaleString()}` expressions.
 * They were not merely repetitive — bare `toLocaleString()` has two defects
 * for money, and both are invisible until they are not:
 *
 *  1. **It takes the locale from the runtime.** A browser set to de-DE
 *     renders 1234.5 as "1.234,5" — the separators swap meaning. The admins
 *     are in Ghana but their machines are not guaranteed to be, and neither
 *     is a server render. This pins en-GH.
 *
 *  2. **It allows three fraction digits.** 1234.567 renders as "₵1,234.567",
 *     which is not a currency amount. Capped at two here.
 *
 * The default keeps what the call sites already rendered — no forced ".00",
 * because the values in this panel are mostly whole cedis and adding decimals
 * everywhere is a visible change across every financial screen. Pass
 * `decimals: 2` for a financial table where alignment matters; that is the
 * better display for money and is worth adopting deliberately, screen by
 * screen, rather than as a side effect of this refactor.
 */
export interface CurrencyOptions {
  /** Fixed decimal places. Default: 0–2, whatever the value needs. */
  decimals?: 0 | 2;
  /** Compact notation (₵12.4K) above `compactAbove`. */
  compact?: boolean;
  compactAbove?: number;
  /** Rendered when the value is null, undefined or not a number. */
  fallback?: string;
}

export function formatCurrency(
  value: number | string | null | undefined,
  opts: CurrencyOptions = {},
): string {
  const {
    decimals,
    compact = false,
    compactAbove = 10_000,
    fallback = `${CEDI}0`,
  } = opts;

  const n = typeof value === "string" ? Number(value) : value;
  if (n === null || n === undefined || !Number.isFinite(n)) return fallback;

  if (compact && Math.abs(n) >= compactAbove) {
    return `${CEDI}${COMPACT.format(n)}`;
  }

  return `${CEDI}${new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? 2,
  }).format(n)}`;
}

/**
 * Date as `YYYY-MM-DD`.
 *
 * Replaces the moment-based helper in `app/utils/helpers.js`, which was the
 * last thing in the tree importing moment. Built on Intl rather than date-fns
 * so it carries no library at all: `en-CA` is the locale whose short date
 * format *is* ISO, which avoids hand-assembling the string and getting the
 * timezone wrong.
 *
 * Note this renders the date in the viewer's timezone, matching what
 * `moment(x).format("YYYY-MM-DD")` did. For a UTC calendar day — an export
 * filename, a database key — use `toISOString().slice(0, 10)` instead; the
 * two disagree either side of midnight.
 */
export function formatDate(
  value: string | number | Date | null | undefined,
  fallback = "—",
): string {
  if (value === null || value === undefined || value === "") return fallback;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
