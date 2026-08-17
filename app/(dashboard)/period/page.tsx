"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  BookOpenCheck,
  BrainCircuit,
  CalendarCheck,
  ClipboardList,
  Download,
  Flag,
  HeartHandshake,
  Loader2,
  Megaphone,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DataTable, {
  type Column,
  type RowAction,
} from "@/components/redesign/DataTable";
import KpiCard from "@/components/redesign/KpiCard";
import PageHeader from "@/components/redesign/PageHeader";
import { cn } from "@/lib/utils";
import { PERIOD_TAB_IDS, type PeriodTabId } from "@/lib/period-tracker";
import TopicCategorySelect from "@/components/period_tracker/TopicCategorySelect";

type Row = Record<string, any>;
type Tab = {
  id: PeriodTabId;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const tabs: Tab[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Adoption, retention and data health",
    icon: Activity,
  },
  {
    id: "users",
    label: "Users & Cycles",
    description: "One privacy-minimized row per tracker",
    icon: Users,
  },
  {
    id: "logs",
    label: "Daily Logs",
    description: "Structured observations and sync state",
    icon: ClipboardList,
  },
  {
    id: "corrections",
    label: "Corrections",
    description: "Review calendar changes with an audit trail",
    icon: CalendarCheck,
  },
  {
    id: "safety",
    label: "Safety Review",
    description: "Non-diagnostic signals and review SLAs",
    icon: Flag,
  },
  {
    id: "notes",
    label: "Calendar Notes",
    description: "Flag metadata without exposing note text",
    icon: ClipboardList,
  },
  {
    id: "consent",
    label: "Consent & Privacy",
    description: "Consent history and privacy requests",
    icon: ShieldCheck,
  },
  {
    id: "content",
    label: "Content",
    description: "Clinically governed education",
    icon: BookOpenCheck,
  },
  {
    id: "engagement",
    label: "Engagement",
    description: "Consent-filtered campaigns and notifications",
    icon: Megaphone,
  },
  {
    id: "trivia",
    label: "Trivia",
    description: "Reviewed questions and learning outcomes",
    icon: Sparkles,
  },
  {
    id: "forecasts",
    label: "Forecasts",
    description: "Accuracy, confidence, drift and rollout",
    icon: BrainCircuit,
  },
  {
    id: "quality",
    label: "App Quality",
    description: "Sync, client health and feature flags",
    icon: Settings2,
  },
];

const date = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "—";
const dateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
const pct = (value?: number | null) =>
  value == null ? "Not measured" : `${value}%`;
const shortId = (value?: string) => (value ? `${value.slice(0, 8)}…` : "—");
const bool = (value: boolean) => (
  <span className={cn("badge", value ? "badge-green" : "badge-blue")}>
    {value ? "Yes" : "No"}
  </span>
);
// Marketing/research consent: distinguishes "never asked" from an actual
// decline -- the mobile app doesn't offer these yet, so every user is
// "not_asked" today, and that's not the same thing as "No".
const consentState = (value: "granted" | "declined" | "not_asked") => (
  <span
    className={cn(
      "badge",
      value === "granted"
        ? "badge-green"
        : value === "declined"
          ? "badge-blue"
          : "badge-slate",
    )}
  >
    {value === "granted" ? "Yes" : value === "declined" ? "No" : "Not asked"}
  </span>
);
const status = (value: string, row?: Row) => (
  <span
    className={cn(
      "badge",
      row?.overdue
        ? "badge-red"
        : ["resolved", "published", "active", "synced", "approved"].includes(
              value,
            )
          ? "badge-green"
          : ["urgent", "failed", "rejected", "paused"].includes(value)
            ? "badge-red"
            : "badge-blue",
    )}
  >
    {String(value ?? "unknown").replaceAll("_", " ")}
  </span>
);

const columns: Record<Exclude<PeriodTabId, "overview">, Column<Row>[]> = {
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
    { key: "position", label: "#", render: (value) => value ?? "—" },
    { key: "question", label: "Question" },
    { key: "topic", label: "Topic" },
    { key: "difficulty", label: "Difficulty" },
    { key: "validation_status", label: "Validation", render: status },
    { key: "status", label: "Status", render: status },
    { key: "published_at", label: "Published", render: date },
    { key: "created_at", label: "Created", render: date },
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
};

export default function PeriodPage() {
  return (
    <Suspense
      fallback={
        <div className="empty-st" role="status">
          Loading Period Tracker…
        </div>
      }
    >
      <PeriodWorkspace />
    </Suspense>
  );
}

function PeriodWorkspace() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab");
  const initialTab = PERIOD_TAB_IDS.includes(requested as PeriodTabId)
    ? (requested as PeriodTabId)
    : "overview";
  const [activeTab, setActiveTab] = useState<PeriodTabId>(initialTab);
  const [payload, setPayload] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [saving, setSaving] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        tab: activeTab,
        page: String(page),
        pageSize: "50",
      });
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/period/data?${params}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "Unable to load Period Tracker data",
        );
      setPayload(result);
    } catch (cause) {
      setPayload({});
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load Period Tracker data",
      );
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, query]);

  useEffect(() => {
    const timeout = setTimeout(loadData, query ? 250 : 0);
    return () => clearTimeout(timeout);
  }, [loadData, query]);
  useEffect(() => {
    if (PERIOD_TAB_IDS.includes(requested as PeriodTabId))
      setActiveTab(requested as PeriodTabId);
  }, [requested]);
  useEffect(() => {
    setPage(1);
    setQuery("");
    setShowCreate(false);
    setShowExport(false);
    setMessage(null);
  }, [activeTab]);

  const selectTab = (index: number) => {
    const next = (index + tabs.length) % tabs.length;
    const tab = tabs[next].id;
    setActiveTab(tab);
    window.history.replaceState(null, "", `/period?tab=${tab}`);
    tabRefs.current[next]?.focus();
  };

  const mutate = useCallback(
    async (body: Record<string, unknown>, success: string) => {
      setSaving(true);
      setError(null);
      setMessage(null);
      try {
        const response = await fetch("/api/period/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            typeof result.error === "string"
              ? result.error
              : "Unable to save this change",
          );
        setMessage(success);
        setShowCreate(false);
        await loadData();
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Unable to save this change",
        );
      } finally {
        setSaving(false);
      }
    },
    [loadData],
  );

  const createRecord = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (activeTab === "engagement")
      return mutate(
        {
          action: "create_campaign",
          name: form.get("name"),
          campaignType: form.get("campaignType"),
          channel: form.get("channel"),
          region: form.get("region") || undefined,
          partnerName: form.get("partnerName") || undefined,
          scheduledAt: form.get("scheduledAt")
            ? new Date(String(form.get("scheduledAt"))).toISOString()
            : undefined,
          minimumCohortSize: Number(form.get("minimumCohortSize")),
          frequencyCapDays: Number(form.get("frequencyCapDays")),
        },
        "Campaign draft created. It still requires consent-safe audience validation and approval.",
      );
    if (activeTab === "trivia")
      return mutate(
        {
          action: "create_trivia_question",
          topic: form.get("topic"),
          question: form.get("question"),
          options: String(form.get("options") ?? "")
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean),
          correctOption: Number(form.get("correctOption")) - 1,
          explanation: form.get("explanation"),
          difficulty: form.get("difficulty"),
        },
        "Trivia question created for editorial and clinical review.",
      );
    return mutate(
      {
        action: "create_content",
        title: form.get("title"),
        topic: form.get("topic"),
        contentType: form.get("contentType"),
        locale: form.get("locale"),
        summary: form.get("summary") || undefined,
        bodyHtml: form.get("bodyHtml"),
        tags: String(form.get("tags") ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        coverImageUrl: form.get("coverImageUrl") || undefined,
        readingMinutes: form.get("readingMinutes")
          ? Number(form.get("readingMinutes"))
          : undefined,
        readingLevel: form.get("readingLevel"),
        featured: form.get("featured") === "on",
      },
      "Content draft created for clinical review.",
    );
  };

  const rowActions = useMemo<RowAction<Row>[]>(() => {
    if (activeTab === "corrections")
      return [
        {
          label: "Approve correction",
          onClick: (row) =>
            mutate(
              {
                action: "review_correction",
                id: row.id,
                resolution: "approved",
              },
              "Correction approved and audit trail updated.",
            ),
        },
        {
          label: "Reject correction",
          danger: true,
          onClick: (row) =>
            mutate(
              {
                action: "review_correction",
                id: row.id,
                resolution: "rejected",
              },
              "Correction rejected.",
            ),
        },
      ];
    if (activeTab === "safety")
      return [
        {
          label: "Start review",
          onClick: (row) =>
            mutate(
              {
                action: "review_safety",
                id: row.id,
                resolution: "in_review",
                resolutionCode: "review_started",
              },
              "Safety signal assigned for review.",
            ),
        },
        {
          label: "Resolve signal",
          onClick: (row) =>
            mutate(
              {
                action: "review_safety",
                id: row.id,
                resolution: "resolved",
                resolutionCode: "review_complete",
              },
              "Safety signal resolved. This is not a medical diagnosis.",
            ),
        },
        {
          label: "Dismiss false signal",
          danger: true,
          onClick: (row) =>
            mutate(
              {
                action: "review_safety",
                id: row.id,
                resolution: "dismissed",
                resolutionCode: "false_signal",
              },
              "Safety signal dismissed with an audit record.",
            ),
        },
      ];
    if (activeTab === "notes")
      return [
        {
          label: "Start review",
          onClick: (row) =>
            mutate(
              {
                action: "review_note",
                id: row.id,
                resolution: "in_review",
                resolutionCode: "review_started",
              },
              "Flagged-note metadata assigned for review.",
            ),
        },
        {
          label: "Clear flag",
          onClick: (row) =>
            mutate(
              {
                action: "review_note",
                id: row.id,
                resolution: "cleared",
                resolutionCode: "no_action_required",
              },
              "Flag cleared without exposing note text.",
            ),
        },
        {
          label: "Escalate",
          danger: true,
          onClick: (row) =>
            mutate(
              {
                action: "review_note",
                id: row.id,
                resolution: "escalated",
                resolutionCode: "specialist_review",
              },
              "Flag escalated for specialist review.",
            ),
        },
      ];
    if (activeTab === "content")
      return [
        {
          label: "Send to review",
          onClick: (row) =>
            mutate(
              { action: "update_content_status", id: row.id, status: "review" },
              "Content sent to review.",
            ),
        },
        {
          label: "Publish as reviewed",
          onClick: (row) =>
            mutate(
              {
                action: "update_content_status",
                id: row.id,
                status: "published",
              },
              "Content marked clinically reviewed and published.",
            ),
        },
        {
          label: "Archive",
          danger: true,
          onClick: (row) =>
            mutate(
              {
                action: "update_content_status",
                id: row.id,
                status: "archived",
              },
              "Content archived.",
            ),
        },
      ];
    if (activeTab === "engagement")
      return [
        {
          label: "Approve and schedule",
          onClick: (row) =>
            mutate(
              {
                action: "update_campaign_status",
                id: row.id,
                status: "scheduled",
              },
              "Campaign approved against current consent and cohort rules.",
            ),
        },
        {
          label: "Pause campaign",
          onClick: (row) =>
            mutate(
              {
                action: "update_campaign_status",
                id: row.id,
                status: "paused",
              },
              "Campaign paused.",
            ),
        },
        {
          label: "Cancel campaign",
          danger: true,
          onClick: (row) =>
            mutate(
              {
                action: "update_campaign_status",
                id: row.id,
                status: "cancelled",
              },
              "Campaign cancelled.",
            ),
        },
      ];
    if (activeTab === "trivia")
      return [
        {
          label: "Send to review",
          onClick: (row) =>
            mutate(
              {
                action: "update_trivia_question_status",
                id: row.id,
                status: "review",
              },
              "Question sent to review.",
            ),
        },
        {
          label: "Publish as reviewed",
          onClick: (row) =>
            mutate(
              {
                action: "update_trivia_question_status",
                id: row.id,
                status: "published",
              },
              "Question validated and published for its scheduled event.",
            ),
        },
        {
          label: "Archive",
          danger: true,
          onClick: (row) =>
            mutate(
              {
                action: "update_trivia_question_status",
                id: row.id,
                status: "archived",
              },
              "Question archived.",
            ),
        },
      ];
    if (activeTab === "forecasts")
      return [
        {
          label: "Pause model cohort",
          danger: true,
          onClick: (row) =>
            mutate(
              {
                action: "update_forecast_status",
                id: row.id,
                status: "paused",
              },
              "Forecast cohort paused and audited.",
            ),
        },
        {
          label: "Return to testing",
          onClick: (row) =>
            mutate(
              {
                action: "update_forecast_status",
                id: row.id,
                status: "testing",
              },
              "Forecast cohort returned to testing.",
            ),
        },
      ];
    return [];
  }, [activeTab, mutate]);

  const exportAggregate = async (reason: string) => {
    const rows = payload.data ?? [];
    if (!rows.length) return;
    setSaving(true);
    setError(null);
    const auditResponse = await fetch("/api/period/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "audit_export",
        scope: activeTab,
        rowCount: rows.length,
        reason,
      }),
    });
    if (!auditResponse.ok) {
      const result = await auditResponse.json().catch(() => ({}));
      setError(
        typeof result.error === "string"
          ? result.error
          : "Unable to authorize export",
      );
      setSaving(false);
      return;
    }
    const excluded = new Set([
      "id",
      "userId",
      "user_id",
      "before_values",
      "proposed_values",
      "trigger_summary",
    ]);
    const keys = Object.keys(rows[0]).filter((key) => !excluded.has(key));
    const escape = (value: unknown) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [
      keys.map(escape).join(","),
      ...rows.map((row: Row) => keys.map((key) => escape(row[key])).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `period-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setSaving(false);
    setShowExport(false);
    setMessage("Aggregate export created and recorded in the admin audit log.");
  };

  const selected = tabs.find((tab) => tab.id === activeTab)!;
  return (
    <div className="page space-y-4">
      <PageHeader
        title="Period Tracker Operations"
        subtitle="Privacy-minimized operations for Plasence cycles, safety, learning, engagement and forecast quality"
      >
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />{" "}
          Refresh
        </button>
        {activeTab !== "overview" &&
          ![
            "users",
            "logs",
            "consent",
            "safety",
            "notes",
            "corrections",
          ].includes(activeTab) && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowExport((value) => !value)}
              disabled={!payload.data?.length}
              aria-expanded={showExport}
            >
              <Download className="h-4 w-4" /> Export aggregate
            </button>
          )}
        {["content", "engagement", "trivia"].includes(activeTab) && (
          <Link
            className="btn btn-secondary btn-sm"
            href={
              activeTab === "content"
                ? "/ai-hub/period/content"
                : "/ai-hub/period"
            }
          >
            <Sparkles className="h-4 w-4" /> AI workspace
          </Link>
        )}
        {["content", "engagement", "trivia"].includes(activeTab) && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowCreate((value) => !value)}
            aria-expanded={showCreate}
          >
            <Plus className="h-4 w-4" /> New{" "}
            {activeTab === "content"
              ? "content"
              : activeTab === "trivia"
                ? "question"
                : "campaign"}
          </button>
        )}
      </PageHeader>

      <div
        className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950"
        role="note"
      >
        <strong>Restricted health operations.</strong> Identity and free-text
        notes are excluded from list views. Fertility forecasts and safety
        signals are estimates for review, not medical advice or diagnoses.
        Sensitive health attributes cannot be used for marketing.
      </div>

      <div
        className="tabs flex-nowrap overflow-x-auto lg:flex-wrap lg:overflow-visible"
        role="tablist"
        aria-label="Period Tracker operations"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            id={`period-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`period-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={cn(
              "tab whitespace-nowrap flex items-center gap-1!",
              activeTab === tab.id && "active",
            )}
            onClick={() => selectTab(index)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                selectTab(index + 1);
              }
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                selectTab(index - 1);
              }
              if (event.key === "Home") {
                event.preventDefault();
                selectTab(0);
              }
              if (event.key === "End") {
                event.preventDefault();
                selectTab(tabs.length - 1);
              }
            }}
          >
            <tab.icon className="h-3.5 w-3.5" aria-hidden="true" /> {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
          role="alert"
        >
          {error}
        </div>
      )}
      {message && (
        <div
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
          role="status"
        >
          {message}
        </div>
      )}
      {showExport && (
        <form
          className="card flex flex-col gap-3 p-4 md:flex-row md:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            const reason = String(
              new FormData(event.currentTarget).get("reason") ?? "",
            );
            exportAggregate(reason);
          }}
          aria-label="Authorize aggregate export"
        >
          <label className="form-label flex-1">
            Export justification
            <input
              name="reason"
              required
              minLength={5}
              maxLength={300}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="Why is this aggregate export needed?"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowExport(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={saving}
            >
              {saving ? "Authorizing…" : "Authorize and export"}
            </button>
          </div>
        </form>
      )}
      {showCreate && (
        <CreateForm
          activeTab={activeTab}
          saving={saving}
          onSubmit={createRecord}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <section
        id={`period-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`period-tab-${activeTab}`}
        tabIndex={0}
      >
        {loading ? (
          <div className="empty-st" role="status">
            <Loader2 className="h-6 w-6 animate-spin text-ek-emerald-active" />
            <p className="empty-st-m mt-2">Loading {selected.label}…</p>
          </div>
        ) : activeTab === "overview" ? (
          <Overview payload={payload} />
        ) : (
          <div className="space-y-4">
            {activeTab === "quality" && (
              <FeatureFlags
                flags={payload.featureFlags ?? []}
                saving={saving}
                mutate={mutate}
              />
            )}
            {activeTab === "content" && (
              <LibraryOperations
                rows={payload.data ?? []}
                collections={payload.collections ?? []}
                saving={saving}
                mutate={mutate}
              />
            )}
            {activeTab === "trivia" && (
              <SummaryNote
                icon={<Sparkles className="h-4 w-4" />}
                text={`${payload.summary?.attempts30d ?? 0} attempts in 30 days · ${pct(payload.summary?.correctRate)} correct answers`}
              />
            )}
            {activeTab === "trivia" && (
              <TriviaOperations
                events={payload.events ?? []}
                leads={payload.leads ?? []}
                saving={saving}
                mutate={mutate}
              />
            )}
            {activeTab === "engagement" && (
              <SummaryNote
                icon={<HeartHandshake className="h-4 w-4" />}
                text={`Delivery events (30d): ${
                  Object.entries(payload.eventCounts ?? {})
                    .map(([key, value]) => `${key} ${value}`)
                    .join(" · ") || "No events"
                }`}
              />
            )}
            {activeTab === "consent" && (
              <PrivacyRequests
                rows={payload.privacyRequests ?? []}
                saving={saving}
                mutate={mutate}
              />
            )}
            <div className="card">
              <div className="card-header flex-wrap gap-3">
                <div>
                  <div className="card-title">{selected.label}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {selected.description} ·{" "}
                    {payload.pagination?.total ?? payload.data?.length ?? 0}{" "}
                    records
                  </div>
                </div>
                <label className="sr-only" htmlFor="period-search">
                  Search {selected.label}
                </label>
                <input
                  id="period-search"
                  type="search"
                  className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder={`Search ${selected.label.toLowerCase()}`}
                />
              </div>
              <DataTable
                caption={`${selected.label} records`}
                columns={columns[activeTab]}
                data={payload.data ?? []}
                pagination
                externalPage={payload.pagination?.page ?? page}
                externalTotalPages={payload.pagination?.totalPages ?? 1}
                onPageChange={setPage}
                getRowId={(row, index) => row.id ?? `${activeTab}-${index}`}
                rowActions={rowActions}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Overview({ payload }: { payload: any }) {
  const summary = payload.summary ?? {};
  const regionColumns: Column<Row>[] = [
    { key: "region", label: "Region" },
    { key: "activeTrackers", label: "Active (30d)" },
    { key: "totalTrackers", label: "Total" },
    { key: "new30d", label: "New (30d)" },
    {
      key: "averageCycle",
      label: "Avg Cycle",
      render: (value) => (value == null ? "—" : `${value} days`),
    },
    { key: "retention", label: "Retention", render: pct },
    { key: "irregularRate", label: "Variation Signal", render: pct },
    { key: "marketingOptIn", label: "Marketing Opt-in", render: pct },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard
          icon="👥"
          label="Active Trackers (30d)"
          value={String(summary.activeTrackers ?? 0)}
          variant="blue"
        />
        <KpiCard
          icon="🧑‍🤝‍🧑"
          label="Total Trackers"
          value={String(summary.totalTrackers ?? 0)}
          variant="teal"
        />
        <KpiCard
          icon="📝"
          label="Daily Logs (30d)"
          value={String(summary.logs30d ?? 0)}
          variant="green"
        />
        <KpiCard
          icon="📅"
          label="Cycle Records"
          value={String(summary.cycleLogs ?? 0)}
          variant="purple"
        />
        <KpiCard
          icon="🔄"
          label="Average Cycle"
          value={
            summary.averageCycleLength == null
              ? "Not measured"
              : `${summary.averageCycleLength} days`
          }
          variant="purple"
        />
        <KpiCard
          icon="↩️"
          label="30-day Retention"
          value={pct(summary.retention)}
          variant="blue"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="card-header">
            <div>
              <div className="card-title">Regional operations</div>
              <div className="mt-1 text-xs text-slate-500">
                Unique users; cycle variation is a review signal, not a
                diagnosis.
              </div>
            </div>
          </div>
          <DataTable
            caption="Period Tracker regional operations"
            columns={regionColumns}
            data={payload.regions ?? []}
            pagination={false}
            getRowId={(row) => row.region}
          />
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Daily symptom trends</div>
          </div>
          <div className="space-y-2 p-4">
            {(payload.symptoms ?? []).map((item: Row) => (
              <div
                key={item.name}
                className="flex items-center justify-between border-b border-slate-100 pb-2 text-sm"
              >
                <span>{item.name}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
            {!(payload.symptoms ?? []).length && (
              <p className="text-sm text-slate-500">
                No normalized daily symptom data is available.
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Metric definitions
        </h2>
        <dl className="mt-3 grid gap-3 md:grid-cols-2">
          {Object.entries(payload.definitions ?? {}).map(([key, value]) => (
            <div key={key}>
              <dt className="text-xs font-semibold capitalize text-slate-700">
                {key.replace(/([A-Z])/g, " $1")}
              </dt>
              <dd className="text-xs text-slate-500">{String(value)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function TriviaOperations({
  events,
  leads,
  saving,
  mutate,
}: {
  events: Row[];
  leads: Row[];
  saving: boolean;
  mutate: (body: any, message: string) => Promise<void>;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section
        className="card overflow-hidden"
        aria-labelledby="trivia-events-heading"
      >
        <div className="card-header">
          <div>
            <h3 id="trivia-events-heading" className="card-title">
              Friday schedules
            </h3>
            <p className="text-xs text-slate-500">
              The quiz unlocks only during its reviewed start/end window.
            </p>
          </div>
          <Link href="/ai-hub/period" className="btn btn-primary btn-sm">
            Schedule & generate
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="p-3">Event</th>
                <th className="p-3">Window</th>
                <th className="p-3">Status</th>
                <th className="p-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="p-3 font-medium">{item.title}</td>
                  <td className="p-3">
                    {dateTime(item.starts_at)}
                    <br />
                    <span className="text-xs text-slate-500">
                      to {dateTime(item.ends_at)}
                    </span>
                  </td>
                  <td className="p-3">{status(item.status)}</td>
                  <td className="p-3 text-right">
                    {item.status === "draft" && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={saving}
                        onClick={() =>
                          mutate(
                            { action: "review_trivia_event", id: item.id },
                            "Trivia is ready. The mobile countdown and start controls now follow this window.",
                          )
                        }
                      >
                        Mark ready
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!events.length && (
                <tr>
                  <td colSpan={4} className="p-4 text-slate-500">
                    No Trivia event has been scheduled.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section
        className="card overflow-hidden"
        aria-labelledby="trivia-leads-heading"
      >
        <div className="card-header">
          <div>
            <h3 id="trivia-leads-heading" className="card-title">
              Trivia leads
            </h3>
            <p className="text-xs text-slate-500">
              Consent-gated, encrypted and linked to user records when signed
              in.
            </p>
          </div>
          <span className="badge badge-blue">{leads.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="p-3">Lead</th>
                <th className="p-3">Mobile</th>
                <th className="p-3">Social</th>
                <th className="p-3">User link</th>
                <th className="p-3">Consent</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 20).map((lead) => (
                <tr key={lead.id} className="border-b">
                  <td className="p-3">{lead.name}</td>
                  <td className="p-3">{lead.mobile}</td>
                  <td className="p-3">{lead.socialHandle}</td>
                  <td className="p-3">
                    <code className="text-xs">
                      {lead.user_id ? shortId(lead.user_id) : "Guest"}
                    </code>
                  </td>
                  <td className="p-3">
                    {lead.consent_version}
                    <br />
                    <span className="text-xs text-slate-500">
                      {dateTime(lead.consented_at)}
                    </span>
                  </td>
                  <td className="p-3">{status(lead.status)}</td>
                </tr>
              ))}
              {!leads.length && (
                <tr>
                  <td colSpan={6} className="p-4 text-slate-500">
                    No consented Trivia leads yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function LibraryOperations({
  rows,
  collections,
  saving,
  mutate,
}: {
  rows: Row[];
  collections: Row[];
  saving: boolean;
  mutate: (body: any, message: string) => Promise<void>;
}) {
  const [showCollection, setShowCollection] = useState(false);
  const published = rows.filter((item) => item.status === "published");
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="card-title">Plasence Library connection</h3>
            <p className="mt-1 text-xs text-slate-500">
              Every clinically reviewed published item receives a live mobile
              publication automatically.
            </p>
          </div>
          <a
            className="btn btn-secondary btn-sm"
            href="/api/period/library"
            target="_blank"
            rel="noreferrer"
          >
            Preview feed
          </a>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <div className="text-xl font-semibold">{published.length}</div>
            <div className="text-xs text-slate-500">Published</div>
          </div>
          <div>
            <div className="text-xl font-semibold">
              {
                rows.filter((item) =>
                  ["live", "scheduled"].includes(item.libraryStatus),
                ).length
              }
            </div>
            <div className="text-xs text-slate-500">Mobile-visible</div>
          </div>
          <div>
            <div className="text-xl font-semibold">
              {rows.reduce(
                (sum, item) => sum + Number(item.sourceCount ?? 0),
                0,
              )}
            </div>
            <div className="text-xs text-slate-500">Source links</div>
          </div>
        </div>
      </section>
      <section className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="card-title">Curated collections</h3>
            <p className="mt-1 text-xs text-slate-500">
              Collections group published items without hiding them from All
              Content.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowCollection((value) => !value)}
            aria-expanded={showCollection}
          >
            {showCollection ? "Close" : "New collection"}
          </button>
        </div>
        {showCollection && (
          <form
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              mutate(
                {
                  action: "create_content_collection",
                  title: form.get("title"),
                  description: form.get("description") || undefined,
                  curationType: form.get("curationType"),
                },
                "Library collection draft created.",
              );
            }}
          >
            <label className="form-label">
              Title
              <input
                name="title"
                required
                minLength={2}
                maxLength={160}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="form-label">
              Description
              <input
                name="description"
                maxLength={500}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="form-label">
              Curation
              <select
                name="curationType"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="manual">Manual</option>
                <option value="ai_suggested">AI suggested</option>
                <option value="rule_based">Rule based</option>
              </select>
            </label>
            <button className="btn btn-primary btn-sm" disabled={saving}>
              Create collection
            </button>
          </form>
        )}
        {!!collections.length && !!published.length && (
          <form
            className="mt-4 grid gap-2 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              mutate(
                {
                  action: "add_content_to_collection",
                  collectionId: form.get("collectionId"),
                  contentId: form.get("contentId"),
                  reason: form.get("reason") || undefined,
                  displayOrder: 0,
                },
                "Published content added to the collection.",
              );
            }}
            aria-label="Add published content to a Library collection"
          >
            <label className="form-label">
              Collection
              <select
                name="collectionId"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {collections.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-label">
              Published content
              <select
                name="contentId"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {published.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-label sm:col-span-2">
              Curation reason
              <input
                name="reason"
                maxLength={300}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Why this item belongs in the collection"
              />
            </label>
            <button
              className="btn btn-secondary btn-sm sm:col-span-2"
              disabled={saving}
            >
              Add to collection
            </button>
          </form>
        )}
        <div className="mt-4 space-y-2">
          {collections.slice(0, 5).map((collection) => (
            <div
              key={collection.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
            >
              <div>
                <div className="text-sm font-medium">{collection.title}</div>
                <div className="text-xs text-slate-500">
                  {collection.curation_type?.replaceAll("_", " ")} ·{" "}
                  {collection.period_content_collection_items?.length ?? 0}{" "}
                  items
                </div>
              </div>
              {collection.status === "draft" && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={saving}
                  onClick={() =>
                    mutate(
                      {
                        action: "publish_content_collection",
                        id: collection.id,
                      },
                      "Collection published to the Plasence Library.",
                    )
                  }
                >
                  Publish
                </button>
              )}
            </div>
          ))}
          {!collections.length && (
            <p className="text-sm text-slate-500">No collections yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function CreateForm({
  activeTab,
  saving,
  onSubmit,
  onCancel,
}: {
  activeTab: PeriodTabId;
  saving: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const campaign = activeTab === "engagement";
  const trivia = activeTab === "trivia";
  return (
    <form
      className="card space-y-3 p-4"
      onSubmit={onSubmit}
      aria-label={
        campaign
          ? "Create campaign draft"
          : trivia
            ? "Create trivia question draft"
            : "Create content draft"
      }
    >
      {trivia ? (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="form-label">
              Topic
              <input
                name="topic"
                required
                maxLength={100}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="form-label">
              Difficulty
              <select
                name="difficulty"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
          </div>
          <label className="form-label">
            Question
            <textarea
              name="question"
              required
              minLength={5}
              maxLength={500}
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="form-label">
              Answer options, one per line
              <textarea
                name="options"
                required
                minLength={3}
                className="mt-1 min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="form-label">
              Correct answer number
              <input
                name="correctOption"
                required
                type="number"
                min="1"
                max="6"
                defaultValue="1"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="form-label">
            Learning explanation
            <textarea
              name="explanation"
              required
              minLength={5}
              maxLength={2000}
              className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="form-label">
              {campaign ? "Campaign name" : "Title"}
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                name={campaign ? "name" : "title"}
                required
                maxLength={200}
              />
            </label>
            {campaign ? (
              <label className="form-label">
                Campaign type
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  name="campaignType"
                  required
                  maxLength={100}
                />
              </label>
            ) : (
              <TopicCategorySelect name="topic" required />
            )}
            {campaign ? (
              <>
                <label className="form-label">
                  Channel
                  <select
                    name="channel"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="in_app">In-app</option>
                    <option value="push">Push</option>
                    <option value="email">Email</option>
                  </select>
                </label>
                <label className="form-label">
                  Region only (optional)
                  <input
                    name="region"
                    maxLength={100}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="form-label">
                  Minimum cohort
                  <input
                    name="minimumCohortSize"
                    type="number"
                    min="100"
                    defaultValue="100"
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="form-label">
                  Frequency cap (days)
                  <input
                    name="frequencyCapDays"
                    type="number"
                    min="1"
                    max="90"
                    defaultValue="7"
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="form-label">
                  Schedule (optional)
                  <input
                    name="scheduledAt"
                    type="datetime-local"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="form-label">
                  Partner (optional)
                  <input
                    name="partnerName"
                    maxLength={160}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
              </>
            ) : (
              <>
                <label className="form-label">
                  Content type
                  <select
                    name="contentType"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="article">Article</option>
                    <option value="quick_read">Quick read</option>
                    <option value="video">Video</option>
                    <option value="podcast">Podcast</option>
                    <option value="expert_qa">Expert Q&amp;A</option>
                  </select>
                </label>
                <label className="form-label">
                  Locale
                  <input
                    name="locale"
                    defaultValue="en"
                    required
                    maxLength={12}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="form-label">
                  Tags, comma separated
                  <input
                    name="tags"
                    maxLength={500}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    placeholder="cramps, nutrition, luteal"
                  />
                </label>
                <label className="form-label">
                  Cover image URL
                  <input
                    name="coverImageUrl"
                    type="url"
                    maxLength={2000}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="form-label">
                  Reading minutes
                  <input
                    name="readingMinutes"
                    type="number"
                    min="1"
                    max="180"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    placeholder="Auto"
                  />
                </label>
                <label className="form-label">
                  Reading level
                  <select
                    name="readingLevel"
                    defaultValue="general"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="simple">Simple</option>
                    <option value="general">General</option>
                    <option value="detailed">Detailed</option>
                  </select>
                </label>
                <label className="form-label flex items-center gap-2 pt-6">
                  <input name="featured" type="checkbox" /> Feature in Library
                </label>
              </>
            )}
          </div>
          {!campaign && (
            <>
              <label className="form-label">
                Summary
                <textarea
                  name="summary"
                  maxLength={500}
                  className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="form-label">
                Content
                <textarea
                  name="bodyHtml"
                  required
                  maxLength={50000}
                  className="mt-1 min-h-32 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
            </>
          )}
        </>
      )}
      <p className="text-xs text-slate-500">
        {campaign
          ? "Campaigns remain drafts until consent, cohort-size, frequency and approval checks pass. Health attributes are not accepted as audience filters."
          : trivia
            ? "Questions remain drafts until editorial and clinical review. Explanations are shown after answering."
            : "Publishing records a clinical review timestamp. Drafts are never exposed to users."}
      </p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save draft"}
        </button>
      </div>
    </form>
  );
}

function PrivacyRequests({
  rows,
  saving,
  mutate,
}: {
  rows: Row[];
  saving: boolean;
  mutate: (body: Record<string, unknown>, success: string) => Promise<void>;
}) {
  const requestColumns: Column<Row>[] = [
    { key: "user", label: "User" },
    {
      key: "request_type",
      label: "Request",
      render: (value) => value?.replaceAll("_", " "),
    },
    { key: "status", label: "Status", render: status },
    { key: "created_at", label: "Received", render: dateTime },
    { key: "due_at", label: "Due", render: dateTime },
    { key: "completed_at", label: "Completed", render: dateTime },
  ];
  const actions: RowAction<Row>[] = [
    {
      label: "Verify request",
      onClick: (row) =>
        mutate(
          { action: "update_privacy_request", id: row.id, status: "verified" },
          "Privacy request verified.",
        ),
    },
    {
      label: "Start processing",
      onClick: (row) =>
        mutate(
          {
            action: "update_privacy_request",
            id: row.id,
            status: "processing",
          },
          "Privacy request is being processed.",
        ),
    },
    {
      label: "Mark complete",
      onClick: (row) =>
        mutate(
          { action: "update_privacy_request", id: row.id, status: "completed" },
          "Privacy request completed and audited.",
        ),
    },
    {
      label: "Reject request",
      danger: true,
      onClick: (row) =>
        mutate(
          { action: "update_privacy_request", id: row.id, status: "rejected" },
          "Privacy request rejected and audited.",
        ),
    },
  ];
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Privacy requests</div>
          <div className="mt-1 text-xs text-slate-500">
            Verified export, correction, restriction and deletion requests with
            due dates.
          </div>
        </div>
      </div>
      <DataTable
        caption="Period Tracker privacy requests"
        columns={requestColumns}
        data={rows}
        pagination={false}
        isLoading={saving}
        getRowId={(row) => row.id}
        rowActions={actions}
      />
    </div>
  );
}

function FeatureFlags({
  flags,
  saving,
  mutate,
}: {
  flags: Row[];
  saving: boolean;
  mutate: (body: Record<string, unknown>, success: string) => Promise<void>;
}) {
  return (
    <div className="card p-4">
      <div className="card-title">Staged rollout controls</div>
      <p className="mt-1 text-xs text-slate-500">
        Changes are audited. A disabled flag always has an effective rollout of
        0%.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {flags.map((flag) => (
          <div
            key={flag.key}
            className="rounded-lg border border-slate-200 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {flag.key.replaceAll("_", " ")}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {flag.description}
                </div>
              </div>
              {status(flag.enabled ? "active" : "paused")}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <label className="text-xs text-slate-600">
                Rollout{" "}
                <input
                  id={`rollout-${flag.key}`}
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={flag.rollout_percent}
                  className="ml-1 w-16 rounded border border-slate-300 px-2 py-1"
                />
                %
              </label>
              <button
                type="button"
                disabled={saving}
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const input = document.getElementById(
                    `rollout-${flag.key}`,
                  ) as HTMLInputElement;
                  const rolloutPercent = Number(input.value);
                  mutate(
                    {
                      action: "update_feature_flag",
                      key: flag.key,
                      enabled: rolloutPercent > 0,
                      rolloutPercent,
                    },
                    `${flag.key.replaceAll("_", " ")} rollout updated.`,
                  );
                }}
              >
                Apply
              </button>
            </div>
          </div>
        ))}
      </div>
      {!flags.length && (
        <p className="mt-3 text-sm text-slate-500">
          No feature flags are configured.
        </p>
      )}
    </div>
  );
}

function SummaryNote({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
      {icon}
      <span>{text}</span>
    </div>
  );
}
