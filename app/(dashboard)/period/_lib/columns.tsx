import { cn } from "@/lib/utils";

import type { Column } from "@/components/redesign/DataTable";
import type { PeriodTabId } from "@/lib/period-tracker";

import type { Row } from "./types";
import { bool, consentState, date, dateTime, pct, shortId, status } from "./formatters";

/**
 * Column definitions per tab. 328 lines of table config that used to sit
 * between the formatters and the page component.
 */
export const columns: Record<Exclude<PeriodTabId, "overview">, Column<Row>[]> = {
  users: [
    { key: "user", label: "User" },
    {
      key: "userId",
      label: "User ID",
      render: (value) => <code className="text-[11px]">{shortId(value)}</code>,
    },
    { key: "region", label: "Region" },
    { key: "lastPeriod", label: "Last Period", render: date },
    {
      key: "cycleLength",
      label: "Cycle",
      render: (value) => (value ? `${value} days` : "—"),
    },
    {
      key: "periodLength",
      label: "Period",
      render: (value) => (value ? `${value} days` : "—"),
    },
    { key: "nextForecast", label: "Next Forecast", render: date },
    { key: "ovulationDate", label: "Ovulation Estimate", render: date },
    {
      key: "fertileWindow",
      label: "Fertile Window",
      render: (value) => value || "—",
    },
    { key: "dailyLogs", label: "Daily Logs" },
    { key: "notes", label: "Notes" },
    { key: "marketingOptIn", label: "Marketing", render: bool },
  ],
  logs: [
    { key: "logged_on", label: "Date", render: date },
    { key: "user", label: "User" },
    { key: "region", label: "Region" },
    { key: "flow", label: "Flow", render: (value) => value || "Not logged" },
    { key: "moodsText", label: "Moods" },
    { key: "symptomsText", label: "Symptoms" },
    {
      key: "basal_body_temperature",
      label: "BBT",
      render: (value, row) =>
        value
          ? `${value}°${String(row.temperature_unit ?? "c").toUpperCase()}`
          : "—",
    },
    {
      key: "cervical_mucus",
      label: "Cervical Mucus",
      render: (value) => value?.replaceAll("_", " ") || "—",
    },
    { key: "source", label: "Source" },
    { key: "sync_status", label: "Sync", render: status },
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
      render: (value) => <code className="text-[11px]">{shortId(value)}</code>,
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
        <span className={cn("badge", value ? "badge-red" : "badge-green")}>
          {value}
        </span>
      ),
    },
  ],
  content: [
    { key: "title", label: "Title" },
    { key: "topic", label: "Topic" },
    {
      key: "curation_type",
      label: "Origin",
      render: (value) => value?.replaceAll("_", " ") || "native",
    },
    {
      key: "sourceMenus",
      label: "Linked Sources",
      render: (value, row) =>
        value?.length ? `${value.join(", ")} (${row.sourceCount})` : "Native",
    },
    {
      key: "content_type",
      label: "Type",
      render: (value) => value?.replaceAll("_", " "),
    },
    { key: "locale", label: "Locale" },
    { key: "version", label: "Version" },
    { key: "reads", label: "Reads" },
    { key: "completionRate", label: "Completion", render: pct },
    { key: "helpfulPercent", label: "Helpful", render: pct },
    { key: "clinical_reviewed_at", label: "Clinical Review", render: date },
    { key: "libraryStatus", label: "Plasence Library", render: status },
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
    { key: "openRate", label: "Open Rate", render: pct },
    { key: "actionRate", label: "Action Rate", render: pct },
    { key: "scheduled_at", label: "Scheduled", render: dateTime },
    { key: "status", label: "Status", render: status },
  ],
  trivia: [
    {
      key: "source",
      label: "Source",
      render: (value) => (
        <span className={cn("badge", value === "ai" ? "badge-blue" : "badge-green")}>
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
        <span className={cn("badge", value ? "badge-green" : "badge-blue")}>
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
        <span className={cn("badge", value ? "badge-red" : "badge-green")}>
          {value}
        </span>
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
      render: (value) => <code className="text-[11px]">{shortId(value)}</code>,
    },
    {
      key: "tier",
      label: "Tier",
      render: (value) => (
        <span className="badge badge-purple">
          {String(value ?? "cycle_pro").replaceAll("_", " ")}
        </span>
      ),
    },
    {
      key: "source",
      label: "Source",
      render: (value) => (
        <span
          className={cn(
            "badge",
            value === "onboarding_trial" ? "badge-blue" : "badge-green",
          )}
        >
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
          <span
            className={cn(
              "badge",
              Number(value) <= 3 ? "badge-red" : "badge-green",
            )}
          >
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
      render: (value) => <code className="text-[11px]">{shortId(value)}</code>,
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
    { key: "clinician_name", label: "Clinician", render: (value) => value || "—" },
    { key: "appointment_date", label: "Date", render: date },
    {
      key: "questionsCount",
      label: "Questions Prepared",
      render: (value) =>
        Number(value) > 0 ? (
          <span className="badge badge-green">{value} prepared</span>
        ) : (
          <span className="badge badge-slate">None</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      render: (value) =>
        value === "completed" ? (
          <span className="badge badge-green">completed</span>
        ) : value === "planned" ? (
          <span className="badge badge-blue">planned</span>
        ) : (
          <span className="badge badge-slate">{value}</span>
        ),
    },
  ],
};
