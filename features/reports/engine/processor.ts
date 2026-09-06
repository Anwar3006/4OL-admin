/**
 * Reports menu — run processor.
 *
 * Pipeline per run: collecting → narrating → delivered / failed.
 * Numbers come from collectors.ts (deterministic); words come from
 * narrative.ts (AI). Delivery writes the panel inbox notification and a
 * delivery log per recipient/channel. Email channel is logged as skipped
 * until a mailer is configured — never silently dropped.
 */

import { getAdminClient } from "@/lib/db/admin";
import { collectReportMetrics } from "./collectors";
import {
  generateReportNarrative,
  narrativeProviderConfigured,
  renderMetricsOnlyMarkdown,
} from "./narrative";
import {
  REPORT_SECTION_LABELS,
  type ReportCadence,
  type ReportDefinitionRow,
  type ReportRecipientRow,
  type ReportRunRow,
  type ReportSection,
  type ReportWindow,
} from "./types";

const STUCK_AFTER_MINUTES = 15;

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
};

/** Previous window for a stored run — deterministic from its period. */
export function previousWindow(run: Pick<ReportRunRow, "cadence" | "period_start">): {
  prevStart: string;
  prevEnd: string;
} {
  const start = run.period_start;
  switch (run.cadence as ReportCadence) {
    case "daily": {
      const prevEnd = addDays(start, -1);
      return { prevStart: prevEnd, prevEnd };
    }
    case "weekly":
      return { prevStart: addDays(start, -7), prevEnd: addDays(start, -1) };
    case "monthly": {
      const prevEnd = addDays(start, -1);
      return { prevStart: `${prevEnd.slice(0, 7)}-01`, prevEnd };
    }
    case "quarterly": {
      const prevEnd = addDays(start, -1);
      const month = Number(prevEnd.slice(5, 7));
      const qStartMonth = Math.floor((month - 1) / 3) * 3;
      return {
        prevStart: `${prevEnd.slice(0, 4)}-${String(qStartMonth + 1).padStart(2, "0")}-01`,
        prevEnd,
      };
    }
    case "yearly": {
      const prevEnd = addDays(start, -1);
      const year = Number(prevEnd.slice(0, 4));
      return { prevStart: `${year}-01-01`, prevEnd };
    }
  }
}

/** Runs stuck mid-pipeline longer than the guard window are failed. */
export async function failStuckRuns(): Promise<number> {
  const admin = getAdminClient();
  const cutoff = new Date(Date.now() - STUCK_AFTER_MINUTES * 60_000).toISOString();
  const { data, error } = await admin
    .from("report_runs")
    .update({ status: "failed", error: `Timed out after ${STUCK_AFTER_MINUTES} minutes (auto-failed).`, completed_at: new Date().toISOString() })
    .in("status", ["collecting", "narrating"])
    .lt("started_at", cutoff)
    .select("id");
  if (error) {
    console.error("[reports] stuck-run sweep failed:", error.message);
    return 0;
  }
  return data?.length ?? 0;
}

async function deliverRun(
  run: ReportRunRow,
  definition: ReportDefinitionRow,
): Promise<void> {
  const admin = getAdminClient();
  const { data: recipients, error } = await admin
    .from("report_recipients")
    .select("*")
    .eq("definition_id", definition.id);
  if (error) {
    console.error("[reports] recipient lookup failed:", error.message);
    return;
  }

  const logs: Array<Record<string, unknown>> = [];
  const summary = run.narrative_md?.split("\n").find((line) => line.trim() && !line.startsWith("#")) ??
    `${definition.name} (${run.period_start} → ${run.period_end}) is ready.`;

  for (const recipient of (recipients ?? []) as unknown as ReportRecipientRow[]) {
    for (const channel of recipient.channels?.length ? recipient.channels : ["inbox"]) {
      if (channel === "inbox") {
        const { error: insertError } = await admin.from("notifications").insert({
          user_id: recipient.admin_id,
          title: `📊 ${definition.name} — ${run.cadence} report ready`,
          body: summary.slice(0, 480),
          type: "report",
          metadata: { runId: run.id, definitionId: definition.id, periodStart: run.period_start, periodEnd: run.period_end },
        });
        logs.push({
          run_id: run.id,
          recipient_id: recipient.admin_id,
          channel: "inbox",
          status: insertError ? "failed" : "sent",
          detail: insertError?.message ?? null,
        });
      } else {
        // Email/WhatsApp channels land with their providers; log the skip
        // honestly instead of pretending delivery happened.
        logs.push({
          run_id: run.id,
          recipient_id: recipient.admin_id,
          channel,
          status: "skipped",
          detail: `${channel} delivery is not configured yet — report available in the Reports inbox.`,
        });
      }
    }
  }

  if (logs.length) {
    const { error: logError } = await admin.from("report_delivery_logs").insert(logs);
    if (logError) console.error("[reports] delivery log insert failed:", logError.message);
  }
}

async function alertFailure(run: ReportRunRow, definition: ReportDefinitionRow, message: string): Promise<void> {
  const admin = getAdminClient();
  // Audit trail (actor falls back to the schedule creator for cron runs).
  const actor = run.triggered_by ?? definition.created_by;
  if (actor) {
    try {
      await admin.from("admin_activity_logs").insert({
        actor_id: actor,
        action: "report_failed",
        resource_type: "report_run",
        resource_id: run.id,
        metadata: { definition: definition.name, cadence: run.cadence, error: message.slice(0, 400) },
      });
    } catch {
      // Alerting must never mask the original failure.
    }
  }
  // Notify whoever can fix it.
  const notify = new Set<string>([definition.created_by, run.triggered_by].filter(Boolean) as string[]);
  for (const userId of notify) {
    try {
      await admin.from("notifications").insert({
        user_id: userId,
        title: `⚠️ Report run failed: ${definition.name}`,
        body: message.slice(0, 400),
        type: "report",
        metadata: { runId: run.id, definitionId: definition.id, failed: true },
      });
    } catch {
      // Alerting must never mask the original failure.
    }
  }
}

/**
 * Process a single queued/failed run end-to-end. Returns the final status.
 */
export async function processReportRun(runId: string): Promise<ReportRunRow["status"]> {
  const admin = getAdminClient();
  const { data: runRow, error: runError } = await admin
    .from("report_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();
  if (runError || !runRow) throw new Error(runError?.message ?? "Report run not found");
  const run = runRow as unknown as ReportRunRow;
  if (!["queued", "failed"].includes(run.status)) return run.status;

  const { data: defRow, error: defError } = await admin
    .from("report_definitions")
    .select("*")
    .eq("id", run.definition_id)
    .maybeSingle();
  if (defError || !defRow) throw new Error(defError?.message ?? "Report definition not found");
  const definition = defRow as unknown as ReportDefinitionRow;
  const sections = (Array.isArray(definition.sections) ? definition.sections : []) as ReportSection[];

  await admin.from("report_runs").update({ status: "collecting", started_at: new Date().toISOString(), error: null }).eq("id", run.id);

  try {
    const prev = previousWindow(run);
    const window: ReportWindow = {
      start: run.period_start,
      end: run.period_end,
      prevStart: prev.prevStart,
      prevEnd: prev.prevEnd,
    };

    const collected = await collectReportMetrics(sections, window);
    await admin
      .from("report_runs")
      .update({ status: "narrating", metrics: collected.metrics as unknown as Record<string, unknown>, anomalies: collected.anomalies, awaiting: collected.awaiting })
      .eq("id", run.id);

    let narrative_md: string | null = null;
    let narrative_model: string | null = null;
    if (definition.ai_narrative && narrativeProviderConfigured()) {
      const narrative = await generateReportNarrative({
        definitionName: definition.name,
        cadence: run.cadence,
        window,
        metrics: collected.metrics,
        anomalies: collected.anomalies,
        sections,
      });
      narrative_md = narrative?.narrative_md ?? null;
      narrative_model = narrative?.model ?? null;
    }
    if (!narrative_md) {
      narrative_md = renderMetricsOnlyMarkdown(definition.name, run.cadence, window, collected.metrics, collected.anomalies);
    }

    const status = narrative_model ? "delivered" : "delivered_metrics_only";
    await admin
      .from("report_runs")
      .update({ status, narrative_md, narrative_model, completed_at: new Date().toISOString() })
      .eq("id", run.id);

    const finalRun: ReportRunRow = { ...run, status, narrative_md, metrics: collected.metrics };
    await deliverRun(finalRun, definition);
    return status;
  } catch (err) {
    const message = (err as Error).message;
    await admin
      .from("report_runs")
      .update({ status: "failed", error: message.slice(0, 1000), completed_at: new Date().toISOString() })
      .eq("id", run.id);
    await alertFailure(run, definition, message);
    return "failed";
  }
}

/** Process every queued run (bounded) — used by cron and the manual button. */
export async function processReportQueue(limit = 10): Promise<{ processed: number; statuses: string[] }> {
  await failStuckRuns();
  const admin = getAdminClient();
  const { data: queued, error } = await admin
    .from("report_runs")
    .select("id")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);

  const statuses: string[] = [];
  for (const row of queued ?? []) {
    statuses.push(await processReportRun(row.id));
  }
  return { processed: statuses.length, statuses };
}

/** Section labels helper re-export for the API layer. */
export { REPORT_SECTION_LABELS };
