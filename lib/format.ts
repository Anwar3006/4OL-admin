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
