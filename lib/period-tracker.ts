export const PERIOD_TAB_IDS = [
  "overview",
  "users",
  "logs",
  "corrections",
  "safety",
  "notes",
  "consent",
  "content",
  "engagement",
  "trivia",
  "forecasts",
  "quality",
] as const;

export type PeriodTabId = (typeof PERIOD_TAB_IDS)[number];

export type CycleRecord = {
  id: string;
  user_id: string;
  period_start_date: string;
  period_end_date?: string | null;
  cycle_length?: number | null;
  period_length?: number | null;
  next_period_forecast?: string | null;
  ovulation_forecast?: string | null;
  fertile_window?: string | null;
  current_phase?: string | null;
  source?: string | null;
  created_at: string;
};

export type ConsentRecord = {
  user_id: string;
  consent_type: "tracking" | "notifications" | "marketing" | "research_analytics";
  granted: boolean;
  policy_version: string;
  source: string;
  created_at: string;
};

export const PERIOD_METRIC_DEFINITIONS = {
  activeTrackers: "Unique users with a confirmed cycle or daily log in the trailing 30 days.",
  newTrackers: "Unique users whose first recorded Period Tracker activity occurred in the trailing 30 days.",
  retention: "Users active in both the preceding 30-day window and the current 30-day window.",
  regularity: "Variation across at least three completed cycles; this is a tracking signal, not a diagnosis.",
  forecastError: "Absolute days between a predicted start date and the next confirmed period start.",
} as const;

export const SENSITIVE_AUDIENCE_KEYS = new Set([
  "goal",
  "pregnancy_intent",
  "pcos",
  "sexual_activity",
  "medication",
  "symptom",
  "symptoms",
  "safety_flag",
  "fertility",
]);

export function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : null;
}

export function average(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => Number.isFinite(value));
  return valid.length
    ? Math.round((valid.reduce((sum, value) => sum + value, 0) / valid.length) * 10) / 10
    : null;
}

export function latestConsents(rows: ConsentRecord[]) {
  const latest = new Map<string, Map<ConsentRecord["consent_type"], ConsentRecord>>();
  for (const row of [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    const user = latest.get(row.user_id) ?? new Map();
    if (!user.has(row.consent_type)) user.set(row.consent_type, row);
    latest.set(row.user_id, user);
  }
  return latest;
}

export function latestCyclePerUser(rows: CycleRecord[]) {
  const latest = new Map<string, CycleRecord>();
  for (const row of [...rows].sort((a, b) => b.period_start_date.localeCompare(a.period_start_date))) {
    if (!latest.has(row.user_id)) latest.set(row.user_id, row);
  }
  return latest;
}

export function calculateRetention(
  currentUserIds: Iterable<string>,
  previousUserIds: Iterable<string>,
) {
  const current = new Set(currentUserIds);
  const previous = new Set(previousUserIds);
  return percent([...previous].filter((id) => current.has(id)).length, previous.size);
}

export function containsSensitiveAudience(target: unknown): boolean {
  if (!target || typeof target !== "object") return false;
  return Object.keys(target as Record<string, unknown>).some((key) =>
    SENSITIVE_AUDIENCE_KEYS.has(key.toLowerCase()),
  );
}

export function safeAudienceSummary(target: unknown) {
  if (!target || typeof target !== "object" || Array.isArray(target)) return "All consented users";
  const entries = Object.entries(target as Record<string, unknown>);
  if (!entries.length) return "All consented users";
  return entries
    .map(([key, value]) => `${key.replaceAll("_", " ")}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
    .join(" · ");
}

export function clampPage(value: string | null, fallback = 1) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function clampPageSize(value: string | null, fallback = 50) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 10 && parsed <= 100 ? parsed : fallback;
}
