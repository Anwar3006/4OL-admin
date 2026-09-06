/**
 * Reports menu — shared types and section catalog.
 *
 * Design rules (mirrored from supabase/migrations/20260830_admin_reports_menu.sql):
 *   - Numbers are deterministic: collectors compute every figure, the AI
 *     only writes the narrative from the resulting JSON.
 *   - Runs hold aggregates only — no PII fields exist in this schema.
 *   - Sections without a live data source must render "awaiting data",
 *     never fabricated values.
 */

export const REPORT_SECTIONS = [
  "users",
  "traction",
  "admin_activity",
  "security",
  "finance",
  "ai",
  "marketing",
] as const;

export type ReportSection = (typeof REPORT_SECTIONS)[number];

export const REPORT_SECTION_LABELS: Record<ReportSection, string> = {
  users: "Users & Growth",
  traction: "Mobile App Traction",
  admin_activity: "Admin Performance & Tasks",
  security: "Security Posture",
  finance: "Finance",
  ai: "AI Hub Usage",
  marketing: "Campaigns & Outreach",
};

export const REPORT_CADENCES = ["daily", "weekly", "monthly", "quarterly", "yearly"] as const;
export type ReportCadence = (typeof REPORT_CADENCES)[number];

export const REPORT_STATUSES = [
  "queued",
  "collecting",
  "narrating",
  "delivered",
  "delivered_metrics_only",
  "failed",
] as const;
export type ReportRunStatus = (typeof REPORT_STATUSES)[number];

/** Current vs previous window; null = source could not provide the value. */
export interface MetricValue {
  current: number | null;
  previous: number | null;
}

export interface SectionResult {
  section: ReportSection;
  status: "live" | "awaiting";
  /** Present when status === 'awaiting' — the honest reason. */
  note?: string;
  metrics: Record<string, MetricValue>;
  /** Facts-with-numbers that deserve a lead in the executive summary. */
  anomalies: string[];
}

export interface ReportWindow {
  start: string; // ISO date (YYYY-MM-DD), inclusive
  end: string;   // ISO date, inclusive
  prevStart: string;
  prevEnd: string;
}

export interface ReportDefinitionRow {
  id: string;
  name: string;
  cadence: ReportCadence;
  sections: ReportSection[];
  timezone: string;
  delivery_hour: number;
  ai_narrative: boolean;
  enabled: boolean;
  next_run_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportRecipientRow {
  id: string;
  definition_id: string;
  admin_id: string;
  channels: string[];
  redacted_sections: ReportSection[];
  created_at: string;
  admin_email?: string | null;
}

export interface ReportRunRow {
  id: string;
  definition_id: string;
  cadence: ReportCadence;
  period_start: string;
  period_end: string;
  status: ReportRunStatus;
  metrics: Record<string, SectionResult> | null;
  anomalies: string[];
  awaiting: string[];
  narrative_md: string | null;
  narrative_model: string | null;
  error: string | null;
  triggered_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// ------------------------------------------------------------- windows ----

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const parseIso = (iso: string) => new Date(`${iso}T00:00:00Z`);
const addDaysUtc = (iso: string, days: number) => {
  const d = parseIso(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
};

/** Today's calendar date in the definition's timezone (IANA name). */
function todayInTz(now: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return isoDate(now); // unknown timezone → UTC, still deterministic
  }
}

/** Monday-start week anchor: ISO date of the Monday of the given date. */
function mondayOf(iso: string): string {
  const d = parseIso(iso);
  const dow = (d.getUTCDay() + 6) % 7; // Mon=0
  return addDaysUtc(iso, -dow);
}

/**
 * The last COMPLETED window for a cadence — identical semantics to
 * public.enqueue_due_report_runs() so on-demand runs and cron runs cover
 * the same periods.
 */
export function computeReportWindow(
  cadence: ReportCadence,
  timeZone: string,
  now: Date = new Date(),
): ReportWindow {
  const today = todayInTz(now, timeZone);

  if (cadence === "daily") {
    const end = addDaysUtc(today, -1);
    const prevEnd = addDaysUtc(end, -1);
    return { start: end, end, prevStart: prevEnd, prevEnd };
  }

  if (cadence === "weekly") {
    const end = addDaysUtc(mondayOf(today), -1); // Sunday
    const start = addDaysUtc(end, -6);
    const prevEnd = addDaysUtc(start, -1);
    return { start, end, prevStart: addDaysUtc(prevEnd, -6), prevEnd };
  }

  if (cadence === "monthly") {
    const firstOfMonth = `${today.slice(0, 7)}-01`;
    const end = addDaysUtc(firstOfMonth, -1); // last day of previous month
    const start = `${end.slice(0, 7)}-01`;
    const prevEnd = addDaysUtc(start, -1);
    return { start, end, prevStart: `${prevEnd.slice(0, 7)}-01`, prevEnd };
  }

  if (cadence === "quarterly") {
    const month = Number(today.slice(5, 7));
    const year = Number(today.slice(0, 4));
    const qStartMonth = Math.floor((month - 1) / 3) * 3; // 0-indexed month of current quarter start
    const qStart = `${year}-${String(qStartMonth + 1).padStart(2, "0")}-01`;
    const end = addDaysUtc(qStart, -1);
    const endMonth = Number(end.slice(5, 7));
    const endQStartMonth = Math.floor((endMonth - 1) / 3) * 3;
    const start = `${end.slice(0, 4)}-${String(endQStartMonth + 1).padStart(2, "0")}-01`;
    const prevEnd = addDaysUtc(start, -1);
    const prevMonth = Number(prevEnd.slice(5, 7));
    const prevQStartMonth = Math.floor((prevMonth - 1) / 3) * 3;
    return {
      start,
      end,
      prevStart: `${prevEnd.slice(0, 4)}-${String(prevQStartMonth + 1).padStart(2, "0")}-01`,
      prevEnd,
    };
  }

  // yearly
  const end = `${today.slice(0, 4)}-01-01`;
  const endPrev = addDaysUtc(end, -1); // Dec 31 previous year
  return {
    start: `${endPrev.slice(0, 4)}-01-01`,
    end: endPrev,
    prevStart: `${Number(endPrev.slice(0, 4)) - 1}-01-01`,
    prevEnd: `${Number(endPrev.slice(0, 4)) - 1}-12-31`,
  };
}

/** Idempotency key shared with the SQL enqueue function. */
export function runIdempotencyKey(definitionId: string, window: ReportWindow): string {
  return `${definitionId}:${window.start}:${window.end}`;
}

/** Percent change, null-safe (null when previous is 0/absent). */
export function deltaPct(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
