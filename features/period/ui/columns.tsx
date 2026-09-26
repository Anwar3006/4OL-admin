import { cn } from "@/lib/utils";

import type { Column } from "@/components/redesign/DataTable";
import type { PeriodTabId } from "@/features/period/schema/period-tracker";

import type { Row } from "@/features/period/schema/types";
import { darkPill, neutralPill } from "./pills";
import {
  bbt,
  bool,
  cervicalMucus,
  consentState,
  cycleLength,
  date,
  dateTime,
  exerciseMinutes,
  flow,
  forecastDate,
  goalBadge,
  idBadge,
  medication,
  notTracked,
  pct,
  periodLength,
  purpleText,
  reminderBadge,
  smallText,
  sourceBadge,
  status,
  symptomsList,
  syncStatus,
} from "./formatters";

/** period_content.curation_type -> the wording admin-panel.html uses. */
const ORIGIN_LABELS: Record<string, string> = {
  native: "native",
  manual: "native",
  ai_suggested: "ai assisted",
  ai_curated: "ai curated",
  curated: "curated",
  rule_based: "rule based",
  imported: "imported",
};

const MENU_LABELS: Record<string, string> = {
  healthy_living: "Healthy Living",
  conditions: "Diseases & Conditions",
  symptoms: "Symptoms",
};

const originLabel = (value: unknown) =>
  ORIGIN_LABELS[String(value ?? "native")] ??
  String(value ?? "native").replaceAll("_", " ");

const menuLabel = (value: string) =>
  MENU_LABELS[value] ?? value.replaceAll("_", " ");

/**
 * Column definitions per tab. Badge classes (.b + color modifier) and
 * .id-badge are the scoped mockup-theme port -- see formatters.tsx.
 */
export const columns: Record<
  Exclude<PeriodTabId, "overview">,
  Column<Row>[]
> = {
  users: [
    {
      key: "user",
      label: "User",
      render: (value) => (
        <span style={{ fontWeight: 700 }}>{value || "—"}</span>
      ),
    },
    {
      key: "userId",
      label: "User ID",
      render: (value) => idBadge(value),
    },
    { key: "region", label: "Region", render: smallText },
    { key: "goal", label: "Goal", render: goalBadge },
    {
      key: "lastPeriod",
      label: "Last Period",
      render: (value) => <span className="td-s">{date(value)}</span>,
    },
    { key: "cycleLength", label: "Cycle", render: cycleLength },
    { key: "periodLength", label: "Period", render: periodLength },
    { key: "nextForecast", label: "Next Forecast", render: forecastDate },
    {
      key: "ovulationDate",
      label: "Ovulation Estimate",
      render: (value) => purpleText(date(value)),
    },
    {
      key: "fertileWindow",
      label: "Fertile Window",
      render: purpleText,
    },
    {
      key: "dailyLogs",
      label: "Daily Logs",
      render: (value) => (
        <span style={{ fontWeight: 700 }} className="text-xs 3xl:text-sm">
          {value}
        </span>
      ),
    },
    { key: "reminders", label: "Reminders", render: reminderBadge },
    {
      key: "marketing",
      label: "Marketing",
      render: (value) => consentState(value),
    },
  ],
  logs: [
    {
      key: "logged_on",
      label: "Date",
      render: (value) => (
        <span className="text-3xs 3xl:text-xs">{date(value)}</span>
      ),
    },
    {
      key: "user_id",
      label: "User",
      render: (value) => idBadge(value),
    },
    { key: "region", label: "Region", render: smallText },
    { key: "flow", label: "Flow", render: flow },
    { key: "moodsText", label: "Moods", render: smallText },
    { key: "symptoms", label: "Symptoms", render: symptomsList },
    {
      key: "basal_body_temperature",
      label: "BBT",
      render: (value, row) => bbt(value, row.temperature_unit),
    },
    {
      key: "cervical_mucus",
      label: "Cervical Mucus",
      render: cervicalMucus,
    },
    { key: "exercise_minutes", label: "Exercise", render: exerciseMinutes },
    {
      key: "medication_logged",
      label: "Medication",
      render: (value, row) => medication(value, row.medication_name),
    },
    { key: "source", label: "Source", render: sourceBadge },
    { key: "sync_status", label: "Sync", render: syncStatus },
  ],
  corrections: [
    { key: "user", label: "User" },
    { key: "changes", label: "Fields" },
    { key: "reason", label: "Reason" },
    { key: "forecastImpact", label: "Forecast Impact" },
    { key: "status", label: "Status", render: status },
    { key: "created_at", label: "Requested", render: dateTime },
    { key: "reviewed_at", label: "Reviewed", render: dateTime },
  ],
  safety: [
    { key: "severity", label: "Severity", render: status },
    { key: "user", label: "User" },
    {
      key: "flag_type",
      label: "Signal",
      render: (value) => value?.replaceAll("_", " "),
    },
    { key: "trigger_summary", label: "Trigger Summary" },
    { key: "rule_version", label: "Rule" },
    { key: "status", label: "Status", render: status },
    { key: "due_at", label: "Review Due", render: dateTime },
    { key: "created_at", label: "Raised", render: dateTime },
  ],
  notes: [
    { key: "user", label: "User" },
    { key: "region", label: "Region" },
    { key: "category", label: "Category" },
    { key: "reason", label: "Flag Reason" },
    { key: "review_status", label: "Review Status", render: status },
    {
      key: "resolution_code",
      label: "Resolution",
      render: (value) => value?.replaceAll("_", " ") || "—",
    },
    { key: "flagged_at", label: "Flagged", render: dateTime },
    { key: "reviewed_at", label: "Reviewed", render: dateTime },
  ],
  consent: [
    { key: "user", label: "User" },
    {
      key: "userId",
      label: "User ID",
      render: (value) => idBadge(value),
    },
    { key: "region", label: "Region" },
    { key: "tracking", label: "Tracking", render: bool },
    { key: "notifications", label: "Notifications", render: bool },
    { key: "marketing", label: "Marketing", render: consentState },
    { key: "research", label: "Research", render: consentState },
    { key: "policyVersion", label: "Policy" },
    { key: "lastChanged", label: "Last Changed", render: dateTime },
    {
      key: "openRequests",
      label: "Open Privacy Requests",
      render: (value) => (
        <span className={cn("b", value ? "br" : "bg")}>{value}</span>
      ),
    },
  ],
  // Ported column-for-column from the Content tab in admin-panel.html
  // (#tc-per-content). Topic is a high-contrast pill, Origin and Type are
  // quiet grey pills at the same 10px, Locale stays plain text. See
  // ./pills.tsx for why the old hashed-colour labeledPill is gone: four of
  // the six classes it hashed into have no rule in globals.css, so every
  // Topic cell rendered green.
  content: [
    {
      key: "title",
      label: "Title",
      render: (value) => <span style={{ fontWeight: 700 }}>{value || "—"}</span>,
    },
    {
      key: "topic",
      label: "Topic",
      render: (value) => darkPill(value, "General"),
    },
    {
      key: "curation_type",
      label: "Origin",
      render: (value) => neutralPill(originLabel(value)),
    },
    {
      key: "sourceMenus",
      label: "Linked Sources",
      render: (value, row) =>
        smallText(
          value?.length
            ? `${(value as string[]).map(menuLabel).join(", ")} (${row.sourceCount})`
            : "Native",
        ),
    },
    {
      key: "content_type",
      // Same pill treatment and same 10px as Origin -- they are the two
      // "what kind of thing is this" columns and should read as a pair.
      label: "Type",
      render: (value) => neutralPill(value, "article"),
    },
    { key: "locale", label: "Locale", render: (value) => value || "en" },
    { key: "version", label: "Version", render: (value) => value ?? 1 },
    {
      key: "reads",
      label: "Reads",
      render: (value) => (
        <span style={{ fontWeight: 700 }}>
          {Number(value ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: "completionRate",
      label: "Completion",
      // The mockup greens out a strong completion rate and leaves a weak one
      // plain, so the column reads at a glance instead of needing comparison.
      render: (value) =>
        value == null ? (
          "—"
        ) : (
          <span
            className={cn(Number(value) >= 70 && "font-bold text-emerald-600")}
          >
            {pct(value)}
          </span>
        ),
    },
    { key: "helpfulPercent", label: "Helpful", render: pct },
    {
      key: "clinical_reviewed_at",
      label: "Clinical Review",
      render: (value) =>
        value ? (
          <span className="td-s">{date(value)}</span>
        ) : (
          <span className="text-slate-500">—</span>
        ),
    },
    { key: "status", label: "Status", render: status },
  ],
  engagement: [
    { key: "name", label: "Campaign" },
    { key: "campaign_type", label: "Type" },
    { key: "channel", label: "Channel" },
    { key: "audience", label: "Consent-safe Audience" },
    { key: "minimum_cohort_size", label: "Min Cohort" },
    {
      key: "frequency_cap_days",
      label: "Frequency Cap",
      render: (value) => `${value} days`,
    },
    { key: "reached_count", label: "Reached" },
    {
      key: "openRate",
      label: "Open Rate",
      render: () =>
        notTracked(
          "No pipeline logs a notification open yet -- period_notification_events and period_campaigns.opened_count are never written to. Campaign creation, audience resolution and delivery (reached_count) are real.",
        ),
    },
    {
      key: "actionRate",
      label: "Action Rate",
      render: () =>
        notTracked(
          "No pipeline logs an in-app action on a campaign yet -- period_campaigns.action_count is never written to.",
        ),
    },
    { key: "scheduled_at", label: "Scheduled", render: dateTime },
    { key: "status", label: "Status", render: status },
  ],
  trivia: [
    {
      key: "source",
      label: "Source",
      render: (value) => (
        <span className={cn("b", value === "ai" ? "bbl" : "bg")}>
          {value === "ai" ? "AI" : "Manual"}
        </span>
      ),
    },
    { key: "questionCount", label: "Questions" },
    { key: "createdAt", label: "Created", render: dateTime },
    { key: "validSummary", label: "Validation" },
    { key: "statusSummary", label: "Status", render: (value) => status(value) },
    {
      key: "rewardAttached",
      label: "Reward",
      render: (value) => (
        <span className={cn("b", value ? "bg" : "bbl")}>
          {value ? "Attached" : "None"}
        </span>
      ),
    },
  ],
  forecasts: [
    { key: "model_key", label: "Model" },
    { key: "model_version", label: "Version", render: (value) => value || "—" },
    { key: "metric_date", label: "Metric Date", render: date },
    { key: "sample_size", label: "Sample", render: (value) => value ?? "—" },
    {
      key: "mean_absolute_error",
      label: "Mean Error",
      render: (value) => (value == null ? "—" : `${value} days`),
    },
    {
      key: "confidence_coverage",
      label: "Confidence Coverage",
      render: (value) =>
        value == null ? "—" : pct(Math.round(Number(value) * 1000) / 10),
    },
    { key: "drift_score", label: "Drift", render: (value) => value ?? "—" },
    { key: "recipient_count", label: "Recipients" },
    { key: "openRate", label: "Reminder Open", render: pct },
    { key: "status", label: "Status", render: status },
  ],
  quality: [
    {
      key: "eventName",
      label: "Event",
      render: (value) => value?.replaceAll("_", " "),
    },
    { key: "platform", label: "Platform" },
    { key: "appVersion", label: "App Version" },
    { key: "success", label: "Success" },
    {
      key: "failure",
      label: "Failures",
      render: (value) => (
        <span className={cn("b", value ? "br" : "bg")}>{value}</span>
      ),
    },
    { key: "warning", label: "Warnings" },
    {
      key: "averageDuration",
      label: "Avg Duration",
      render: (value) => (value == null ? "—" : `${value} ms`),
    },
    { key: "latestAt", label: "Latest", render: dateTime },
  ],
  premium: [
    { key: "user", label: "User" },
    {
      key: "user_id",
      label: "User ID",
      render: (value) => idBadge(value),
    },
    {
      key: "tier",
      label: "Tier",
      render: (value) => (
        <span className="b bpu">
          {String(value ?? "cycle_pro").replaceAll("_", " ")}
        </span>
      ),
    },
    {
      key: "source",
      label: "Source",
      render: (value) => (
        <span className={cn("b", value === "onboarding_trial" ? "bbl" : "bg")}>
          {String(value ?? "manual").replaceAll("_", " ")}
        </span>
      ),
    },
    { key: "reason", label: "Reason" },
    { key: "starts_at", label: "Granted", render: date },
    { key: "expires_at", label: "Expires", render: date },
    {
      key: "daysLeft",
      label: "Days Left",
      render: (value, row) =>
        row.state === "revoked" || row.state === "expired" ? (
          "—"
        ) : (
          <span className={cn("b", Number(value) <= 3 ? "br" : "bg")}>
            {value}
          </span>
        ),
    },
    {
      key: "state",
      label: "State",
      render: (value) => status(value),
    },
  ],
  ttc: [
    {
      key: "user_id",
      label: "User",
      render: (value) => idBadge(value),
    },
    {
      key: "purpose",
      label: "Purpose",
      render: (value) => (
        <span className="font-medium">
          {String(value ?? "").replaceAll("_", " ")}
        </span>
      ),
    },
    {
      key: "clinician_name",
      label: "Clinician",
      render: (value) => value || "—",
    },
    { key: "appointment_date", label: "Date", render: date },
    {
      key: "questionsCount",
      label: "Questions Prepared",
      render: (value) =>
        Number(value) > 0 ? (
          <span className="b bg">{value} prepared</span>
        ) : (
          <span className="b bdk">None</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      render: (value) =>
        value === "completed" ? (
          <span className="b bg">completed</span>
        ) : value === "planned" ? (
          <span className="b bbl">planned</span>
        ) : (
          <span className="b bdk">{value}</span>
        ),
    },
  ],
};
