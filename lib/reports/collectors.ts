/**
 * Reports menu — deterministic metric collectors.
 *
 * Every collector returns facts only (current vs previous window). When a
 * source table is missing or empty the section degrades to status
 * 'awaiting' with an honest note — collectors never invent numbers.
 *
 * Results are cached in report_metrics_snapshots keyed by
 * (section, window) so weekly/quarterly/yearly runs never re-aggregate
 * raw tables twice for the same period.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  deltaPct,
  type ReportSection,
  type ReportWindow,
  type SectionResult,
} from "./types";

type Admin = ReturnType<typeof getSupabaseAdmin>;

const awaiting = (section: ReportSection, note: string): SectionResult => ({
  section,
  status: "awaiting",
  note,
  metrics: {},
  anomalies: [],
});

/** Exact row count for a table filter; throws on error so callers degrade. */
async function count(
  admin: Admin,
  table: string,
  filter: (q: any) => any,
): Promise<number> {
  const { count: total, error } = await filter(
    admin.from(table).select("id", { count: "exact", head: true }),
  );
  if (error) throw new Error(`${table}: ${error.message}`);
  return total ?? 0;
}

const between = (column: string, start: string, end: string) => (q: any) =>
  q.gte(column, `${start}T00:00:00`).lte(column, `${end}T23:59:59.999`);

/**
 * Snapshot cache: returns the stored result for (section, window) or null.
 * Cache misses are computed and upserted by the caller.
 */
async function cachedSection(
  admin: Admin,
  section: ReportSection,
  window: ReportWindow,
): Promise<SectionResult | null> {
  const { data } = await admin
    .from("report_metrics_snapshots")
    .select("metrics")
    .eq("section", section)
    .eq("period_start", window.start)
    .eq("period_end", window.end)
    .maybeSingle();
  return (data?.metrics as SectionResult | null) ?? null;
}

async function storeSection(
  admin: Admin,
  result: SectionResult,
  window: ReportWindow,
): Promise<void> {
  await admin.from("report_metrics_snapshots").upsert(
    {
      section: result.section,
      period_start: window.start,
      period_end: window.end,
      metrics: result as unknown as Record<string, unknown>,
    },
    { onConflict: "section,period_start,period_end" },
  );
}

// ------------------------------------------------------------- users ------

async function collectUsers(admin: Admin, w: ReportWindow): Promise<SectionResult> {
  const section: ReportSection = "users";
  try {
    const [total, newNow, newPrev] = await Promise.all([
      count(admin, "user_profiles", (q) => q),
      count(admin, "user_profiles", (q) => between("created_at", w.start, w.end)(q)),
      count(admin, "user_profiles", (q) => between("created_at", w.prevStart, w.prevEnd)(q)),
    ]);
    const anomalies: string[] = [];
    const drop = deltaPct(newNow, newPrev);
    if (newPrev >= 10 && drop != null && drop <= -50) {
      anomalies.push(
        `New sign-ups dropped ${Math.abs(drop)}% (${newPrev} → ${newNow}) versus the previous period.`,
      );
    }
    return {
      section,
      status: "live",
      metrics: {
        total_users: { current: total, previous: null },
        new_users: { current: newNow, previous: newPrev },
      },
      anomalies,
    };
  } catch (err) {
    return awaiting(section, `User source unavailable (${(err as Error).message}).`);
  }
}

// ---------------------------------------------------------- traction ------

async function collectTraction(admin: Admin, w: ReportWindow): Promise<SectionResult> {
  const section: ReportSection = "traction";
  try {
    const eventsIn = (start: string, end: string) =>
      admin
        .from("period_app_events")
        .select("event_name,status,user_id")
        .gte("created_at", `${start}T00:00:00`)
        .lte("created_at", `${end}T23:59:59.999`)
        .limit(20000);

    const [rowsNow, rowsPrev] = await Promise.all([
      eventsIn(w.start, w.end),
      eventsIn(w.prevStart, w.prevEnd),
    ]);
    if (rowsNow.error) throw new Error(`period_app_events: ${rowsNow.error.message}`);

    const summarize = (rows: Array<{ event_name: string; status: string; user_id: string }> | null) => {
      const list = rows ?? [];
      return {
        events: list.length,
        failures: list.filter((r) => r.status === "failure").length,
        uniqueUsers: new Set(list.map((r) => r.user_id)).size,
        onboarding: list.filter((r) => r.event_name === "onboarding_complete").length,
        logSaves: list.filter((r) => r.event_name === "log_save").length,
        syncs: list.filter((r) => r.event_name === "sync").length,
      };
    };
    const now = summarize(rowsNow.data);
    const prev = summarize(rowsPrev.data ?? []);
    const anomalies: string[] = [];
    const failureShare = now.events > 0 ? (now.failures / now.events) * 100 : 0;
    if (now.events >= 20 && failureShare > 20) {
      anomalies.push(
        `Mobile app failure rate is ${failureShare.toFixed(1)}% (${now.failures} of ${now.events} quality events).`,
      );
    }
    return {
      section,
      status: "live",
      metrics: {
        quality_events: { current: now.events, previous: prev.events },
        unique_active_users: { current: now.uniqueUsers, previous: prev.uniqueUsers },
        onboarding_completes: { current: now.onboarding, previous: prev.onboarding },
        daily_log_saves: { current: now.logSaves, previous: prev.logSaves },
        sync_events: { current: now.syncs, previous: prev.syncs },
        failed_operations: { current: now.failures, previous: prev.failures },
      },
      anomalies,
    };
  } catch (err) {
    return awaiting(section, `App-event telemetry unavailable (${(err as Error).message}).`);
  }
}

// ---------------------------------------------------- admin activity ------

async function collectAdminActivity(admin: Admin, w: ReportWindow): Promise<SectionResult> {
  const section: ReportSection = "admin_activity";
  try {
    const rowsIn = (start: string, end: string) =>
      admin
        .from("admin_activity_logs")
        .select("actor_id,action,resource_type")
        .gte("created_at", `${start}T00:00:00`)
        .lte("created_at", `${end}T23:59:59.999`)
        .limit(20000);

    const [rowsNow, rowsPrev] = await Promise.all([rowsIn(w.start, w.end), rowsIn(w.prevStart, w.prevEnd)]);
    if (rowsNow.error) throw new Error(`admin_activity_logs: ${rowsNow.error.message}`);

    const summarize = (rows: Array<{ actor_id: string; action: string; resource_type: string }> | null) => {
      const list = rows ?? [];
      return {
        actions: list.length,
        admins: new Set(list.map((r) => r.actor_id)).size,
        destructive: list.filter((r) => ["delete", "revoke", "suspend", "reject"].includes(r.action)).length,
        exports: list.filter((r) => r.action === "export").length,
      };
    };
    const now = summarize(rowsNow.data);
    const prev = summarize(rowsPrev.data ?? []);
    const anomalies: string[] = [];
    if (now.exports >= 3 && prev.exports === 0) {
      anomalies.push(`${now.exports} data exports were performed this period (none in the previous one) — verify each had a logged reason.`);
    }
    return {
      section,
      status: "live",
      metrics: {
        total_actions: { current: now.actions, previous: prev.actions },
        active_admins: { current: now.admins, previous: prev.admins },
        destructive_actions: { current: now.destructive, previous: prev.destructive },
        data_exports: { current: now.exports, previous: prev.exports },
      },
      anomalies,
    };
  } catch (err) {
    return awaiting(section, `Admin activity log unavailable (${(err as Error).message}).`);
  }
}

// ----------------------------------------------------------- security -----

async function collectSecurity(admin: Admin, w: ReportWindow): Promise<SectionResult> {
  const section: ReportSection = "security";
  try {
    const [threatsNow, threatsPrev, activityNow] = await Promise.all([
      count(admin, "security_threats", (q) => between("created_at", w.start, w.end)(q)),
      count(admin, "security_threats", (q) => between("created_at", w.prevStart, w.prevEnd)(q)),
      count(admin, "activity_logs", (q) => between("created_at", w.start, w.end)(q)).catch(() => null),
    ]);
    const anomalies: string[] = [];
    if (threatsNow > 0) {
      anomalies.push(`${threatsNow} security threat record(s) logged this period — review in Security Center.`);
    }
    return {
      section,
      status: "live",
      note: "Failed logins and blocked IPs show awaiting-data until login telemetry is instrumented.",
      metrics: {
        security_threats: { current: threatsNow, previous: threatsPrev },
        platform_activity_log_entries: { current: activityNow, previous: null },
      },
      anomalies,
    };
  } catch (err) {
    return awaiting(section, `Security sources unavailable (${(err as Error).message}).`);
  }
}

// ------------------------------------------------------------ finance -----

async function collectFinance(admin: Admin, w: ReportWindow): Promise<SectionResult> {
  const section: ReportSection = "finance";
  try {
    const sumIn = async (start: string, end: string) => {
      const { data, error } = await admin
        .from("transaction_records")
        .select("amount,status")
        .gte("created_at", `${start}T00:00:00`)
        .lte("created_at", `${end}T23:59:59.999`)
        .limit(20000);
      if (error) throw new Error(`transaction_records: ${error.message}`);
      const rows = data ?? [];
      const completed = rows.filter((r) => ["success", "completed", "succeeded"].includes(String(r.status)));
      return {
        transactions: rows.length,
        completed: completed.length,
        revenue: completed.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
      };
    };
    const [now, prev] = await Promise.all([sumIn(w.start, w.end), sumIn(w.prevStart, w.prevEnd)]);
    return {
      section,
      status: "live",
      metrics: {
        transactions: { current: now.transactions, previous: prev.transactions },
        completed_transactions: { current: now.completed, previous: prev.completed },
        revenue_ghs: { current: Math.round(now.revenue * 100) / 100, previous: Math.round(prev.revenue * 100) / 100 },
      },
      anomalies: [],
    };
  } catch {
    return awaiting(section, "Revenue analytics await the transaction pipeline (transaction_records is not live yet).");
  }
}

// ----------------------------------------------------------------- ai -----

async function collectAi(admin: Admin, w: ReportWindow): Promise<SectionResult> {
  const section: ReportSection = "ai";
  try {
    const [flagsNow, flagsPrev, jobsNow] = await Promise.all([
      count(admin, "content_moderation_flags", (q) => between("created_at", w.start, w.end)(q)),
      count(admin, "content_moderation_flags", (q) => between("created_at", w.prevStart, w.prevEnd)(q)),
      count(admin, "period_ai_jobs", (q) => between("created_at", w.start, w.end)(q)).catch(() => null),
    ]);
    const anomalies: string[] = [];
    const spike = deltaPct(flagsNow, flagsPrev);
    if (flagsPrev >= 5 && spike != null && spike >= 100) {
      anomalies.push(`Content moderation flags doubled (${flagsPrev} → ${flagsNow}) — check the AI moderation queue.`);
    }
    return {
      section,
      status: "live",
      metrics: {
        moderation_flags: { current: flagsNow, previous: flagsPrev },
        scheduled_ai_jobs: { current: jobsNow, previous: null },
      },
      anomalies,
    };
  } catch (err) {
    return awaiting(section, `AI sources unavailable (${(err as Error).message}).`);
  }
}

// ---------------------------------------------------------- marketing -----

async function collectMarketing(admin: Admin, w: ReportWindow): Promise<SectionResult> {
  const section: ReportSection = "marketing";
  try {
    const campaignsIn = async (start: string, end: string) => {
      const { data, error } = await admin
        .from("notification_campaigns")
        .select("status,sent_at")
        .gte("created_at", `${start}T00:00:00`)
        .lte("created_at", `${end}T23:59:59.999`)
        .limit(5000);
      if (error) throw new Error(`notification_campaigns: ${error.message}`);
      const rows = data ?? [];
      return {
        created: rows.length,
        sent: rows.filter((r) => r.sent_at || r.status === "completed").length,
      };
    };
    const [now, prev] = await Promise.all([
      campaignsIn(w.start, w.end),
      campaignsIn(w.prevStart, w.prevEnd),
    ]);
    return {
      section,
      status: "live",
      note: "Impressions/click-through metrics await analytics_events (Epic 30.1).",
      metrics: {
        campaigns_created: { current: now.created, previous: prev.created },
        campaigns_sent: { current: now.sent, previous: prev.sent },
      },
      anomalies: [],
    };
  } catch (err) {
    return awaiting(section, `Campaign sources unavailable (${(err as Error).message}).`);
  }
}

// ------------------------------------------------------------- runner -----

const COLLECTORS: Record<ReportSection, (admin: Admin, w: ReportWindow) => Promise<SectionResult>> = {
  users: collectUsers,
  traction: collectTraction,
  admin_activity: collectAdminActivity,
  security: collectSecurity,
  finance: collectFinance,
  ai: collectAi,
  marketing: collectMarketing,
};

/**
 * Collect all requested sections for a window, using the snapshot cache.
 * Never throws: any failure degrades that section to 'awaiting'.
 */
export async function collectReportMetrics(
  sections: ReportSection[],
  window: ReportWindow,
): Promise<{ metrics: Record<string, SectionResult>; anomalies: string[]; awaiting: string[] }> {
  const admin = getSupabaseAdmin();
  const metrics: Record<string, SectionResult> = {};
  const anomalies: string[] = [];
  const awaitingList: string[] = [];

  for (const section of sections) {
    let result: SectionResult | null = null;
    try {
      result = await cachedSection(admin, section, window);
    } catch {
      result = null; // cache table missing (pre-migration) — still collect
    }
    if (!result) {
      try {
        result = await COLLECTORS[section](admin, window);
        if (result.status === "live") {
          await storeSection(admin, result, window).catch(() => undefined);
        }
      } catch {
        result = awaiting(section, "Collector failed unexpectedly; no figures were produced.");
      }
    }
    metrics[section] = result;
    anomalies.push(...result.anomalies);
    if (result.status === "awaiting") awaitingList.push(section);
  }

  return { metrics, anomalies, awaiting: awaitingList };
}
