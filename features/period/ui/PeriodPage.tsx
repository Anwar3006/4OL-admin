"use client";

/**
 * Period Tracker admin screen.
 *
 * This file was 3,419 lines. It is the shell now: PeriodPage (the Suspense
 * boundary the route needs) and PeriodWorkspace (tab state, data fetching,
 * export). Each tab is its own file in this directory; the table config and
 * cell formatters sit beside them, and the shared shapes in ../schema/.
 *
 * The split is by tab, not by line count, so a change to one tab touches one
 * file. Nothing here changed behaviour — every extracted block is verbatim.
 */

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Download,
  HeartHandshake,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DataTable, {
  type Column,
  type RowAction,
} from "@/components/redesign/DataTable";
import KpiCard from "@/components/redesign/KpiCard";
import PageHeader from "@/components/redesign/PageHeader";
import Modal from "@/components/redesign/Modal";
import { cn } from "@/lib/utils";
import { PERIOD_TAB_IDS, type PeriodTabId } from "@/features/period/schema/period-tracker";
import { downloadCsv } from "@/lib/csv";

import type { Row, Tab } from "@/features/period/schema/types";
import { tabs } from "@/features/period/schema/types";
import { columns } from "./columns";
import { pct } from "./formatters";
import Overview from "./Overview";
import TriviaOperations, {
  TriviaBatchModal,
} from "./TriviaOperations";
import ViewPeriodUserDialog from "./view-period-user-dialog";
import { useViewPeriodUserDialog } from "@/features/period/data/dialog-hooks";
import LibraryOperations, {
  CreateForm,
} from "./LibraryOperations";
import PrivacyRequests from "./PrivacyRequests";
import FeatureFlags from "./FeatureFlags";
import PremiumOperations from "./PremiumOperations";
import AiSuggestions from "./AiSuggestions";
import TtcOperations from "./TtcOperations";
import SummaryNote from "./SummaryNote";

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
  const [triviaBatchId, setTriviaBatchId] = useState<string | null>(null);
  const viewPeriodUser = useViewPeriodUserDialog<Row>();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const triviaBatch =
    (payload.data ?? []).find((row: Row) => row.batchId === triviaBatchId) ??
    null;

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
    setTriviaBatchId(null);
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
          eventId: form.get("eventId") || undefined,
          rewardId: form.get("rewardId") || undefined,
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

  // Mirrors the mockup's own amber-row highlight for an irregular cycle
  // (admin-panel.html:6143), using the same normal ranges its overview cards
  // state: 21-35 day cycle, 3-7 day period.
  const getUserRowClassName = useCallback((row: Row) => {
    const cycleLength = row.cycleLength as number | null | undefined;
    const periodLength = row.periodLength as number | null | undefined;
    const irregular =
      (cycleLength != null && (cycleLength < 21 || cycleLength > 35)) ||
      (periodLength != null && (periodLength < 3 || periodLength > 7));
    return irregular ? "row-flagged" : undefined;
  }, []);

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
    if (activeTab === "trivia") return [];
    if (activeTab === "ttc") return [];
    if (activeTab === "premium")
      return [
        {
          label: "Extend 14 days",
          onClick: (row) =>
            mutate(
              {
                action: "extend_premium_grant",
                id: row.id,
                days: 14,
              },
              "Grant extended by 14 days, within the 90-day duration cap.",
            ),
        },
        {
          label: "Revoke access",
          danger: true,
          onClick: (row) =>
            mutate(
              { action: "revoke_premium_grant", id: row.id },
              "Premium access revoked and recorded in the audit trail.",
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
    downloadCsv(
      rows.map((row: Row) =>
        Object.fromEntries(keys.map((key) => [key, row[key] as string | number | null])),
      ),
      `period-${activeTab}`,
    );
    setSaving(false);
    setShowExport(false);
    setMessage("Aggregate export created and recorded in the admin audit log.");
  };

  const selected = tabs.find((tab) => tab.id === activeTab)!;
  return (
    <div className="page space-y-4">
      <PageHeader
        title="🩸 Period Tracker Operations"
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
        className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-500/15 p-3 text-xs text-blue-950 dark:text-blue-400"
        role="note"
      >
        <strong>Restricted health operations.</strong> Identity and free-text
        notes are excluded from list views. Fertility forecasts and safety
        signals are estimates for review, not medical advice or diagnoses.
        Sensitive health attributes cannot be used for marketing.
      </div>

      <div
        className="tabs flex-nowrap overflow-x-auto"
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
            <span aria-hidden="true" className="text-sm leading-none">
              {tab.icon}
            </span>{" "}
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-500/15 p-3 text-xs text-red-900 dark:text-red-400"
          role="alert"
        >
          {error}
        </div>
      )}
      {message && (
        <div
          className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-500/15 p-3 text-xs text-emerald-900"
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
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
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
          events={payload.events ?? []}
          rewards={payload.rewards ?? []}
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
            {activeTab === "content" && (
              <AiSuggestions
                suggestions={payload.aiSuggestions ?? []}
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
                rewards={payload.rewards ?? []}
                submissions={payload.submissions ?? []}
                fulfillments={payload.fulfillments ?? []}
                blockedDevices={payload.blockedDevices ?? []}
                rules={payload.rules ?? []}
                saving={saving}
                mutate={mutate}
              />
            )}
            {activeTab === "engagement" &&
              (Object.keys(payload.eventCounts ?? {}).length ? (
                <SummaryNote
                  icon={<HeartHandshake className="h-4 w-4" />}
                  text={`Delivery events (30d): ${Object.entries(
                    payload.eventCounts ?? {},
                  )
                    .map(([key, value]) => `${key} ${value}`)
                    .join(" · ")}`}
                />
              ) : (
                <SummaryNote
                  icon={<Info className="h-4 w-4" />}
                  tone="info"
                  text="Campaign creation and delivery are real — dispatching resolves the consent-opted-in audience and inserts real notifications, and Reached below reflects that. Open Rate, Action Rate and this delivery-event feed are not: nothing logs a notification open or in-app action back yet, so period_notification_events stays empty."
                />
              ))}
            {activeTab === "consent" && (
              <PrivacyRequests
                rows={payload.privacyRequests ?? []}
                saving={saving}
                mutate={mutate}
              />
            )}
            {activeTab === "premium" && (
              <PremiumOperations
                settings={payload.settings ?? null}
                saving={saving}
                mutate={mutate}
              />
            )}
            {activeTab === "ttc" && (
              <TtcOperations
                stats={payload.stats ?? {}}
                checklistReadiness={payload.checklistReadiness ?? []}
                ovulationBreakdown={payload.ovulationBreakdown ?? null}
                insightBreakdown={payload.insightBreakdown ?? []}
              />
            )}
            <div className="card">
              <div className="card-header flex-wrap gap-3">
                <div>
                  <div className="card-title">{selected.label}</div>
                  <div className="mt-1 text-2xs text-slate-500">
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
                  className="w-full max-w-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
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
                getRowId={(row, index) =>
                  row.batchId ?? row.id ?? `${activeTab}-${index}`
                }
                onRowClick={
                  activeTab === "trivia"
                    ? (row) => {
                        if (row.batchId) setTriviaBatchId(row.batchId);
                      }
                    : activeTab === "users"
                      ? (row) => viewPeriodUser.open(row)
                      : undefined
                }
                rowActions={rowActions}
                getRowClassName={
                  activeTab === "users" ? getUserRowClassName : undefined
                }
              />
            </div>
          </div>
        )}
      </section>
      <TriviaBatchModal
        batch={triviaBatch}
        mutate={mutate}
        saving={saving}
        onClose={() => setTriviaBatchId(null)}
      />
      <ViewPeriodUserDialog />
    </div>
  );
}
