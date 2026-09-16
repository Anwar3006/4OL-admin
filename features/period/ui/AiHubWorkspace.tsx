"use client";

/**
 * AI Hub · Period — the job audit trail, and nothing else.
 *
 * This page used to be where Period AI work started: a generation form, a
 * Friday event scheduler and the reward catalog all lived here, while the
 * Period tabs had their own inline create forms. Every task had two homes,
 * and the Trivia tab needed a "Schedule & generate" link pointing away from
 * itself to finish a job it had already started.
 *
 * All of that moved into the New content / New trivia dialogs on the Period
 * tabs, beside the tables the work shows up in. What is left is the one
 * thing that genuinely belongs on its own page: an immutable record of every
 * generation run, including the failures and the model each one used.
 *
 * Read-only by design. If you find yourself adding a form back to this file,
 * it almost certainly belongs in a dialog on the tab that owns the data.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import DataTable, { type Column } from "@/components/redesign/DataTable";
import KpiCard from "@/components/redesign/KpiCard";
import PageHeader from "@/components/redesign/PageHeader";
import { cn } from "@/lib/utils";
import { aiModelLabel } from "@/features/ai/schema/models";

type Row = Record<string, any>;
type Scope = "trivia" | "content";

const dateTime = (value?: string | null) =>
  value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

const statusBadge = (value: string) => (
  <span
    className={cn(
      "badge",
      ["review", "published", "ready", "live"].includes(value) ? "badge-green" : ["failed", "archived"].includes(value) ? "badge-red" : "badge-blue",
    )}
  >
    {String(value ?? "unknown").replaceAll("_", " ")}
  </span>
);

const jobColumns: Column<Row>[] = [
  { key: "job_type", label: "Type", render: (value) => value?.replaceAll("_", " ") },
  { key: "status", label: "Status", render: statusBadge },
  { key: "source_menus", label: "Sources", render: (value) => (Array.isArray(value) ? value.join(", ") : "—") },
  { key: "model_key", label: "Model", render: (value) => aiModelLabel(value) },
  { key: "error_code", label: "Error", render: (value) => value || "—" },
  { key: "created_at", label: "Started", render: dateTime },
  { key: "completed_at", label: "Completed", render: dateTime },
];

export default function AiHubPeriodWorkspace({ scope }: { scope: Scope }) {
  const jobTypes = useMemo(
    () =>
      scope === "trivia"
        ? (["trivia_generation", "engagement_copy"] as const)
        : (["content_curation", "content_suggestion"] as const),
    [scope],
  );
  const [jobs, setJobs] = useState<Row[]>([]);
  const [sourceLinks, setSourceLinks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai-hub/period", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Unable to load the AI workspace");
      setJobs(result.jobs ?? []);
      setSourceLinks(result.sourceLinks ?? 0);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load the AI workspace");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const scopedJobs = useMemo(
    () => jobs.filter((job) => (jobTypes as readonly string[]).includes(job.job_type)),
    [jobs, jobTypes],
  );
  const jobCounts = useMemo(() => {
    const counts = { running: 0, review: 0, failed: 0 };
    for (const job of scopedJobs) {
      if (job.status === "running") counts.running += 1;
      else if (job.status === "review") counts.review += 1;
      else if (job.status === "failed") counts.failed += 1;
    }
    return counts;
  }, [scopedJobs]);

  const tabPath = scope === "trivia" ? "/period?tab=trivia" : "/period?tab=content";
  const tabLabel = scope === "trivia" ? "Trivia" : "Content";
  const createLabel = scope === "trivia" ? "New trivia" : "New content";

  return (
    <div className="page space-y-4">
      <PageHeader
        title={scope === "trivia" ? "AI Hub · Period Trivia & Engagement" : "AI Hub · Period Content"}
        subtitle="Every generation run, including failures. Source-grounded drafts only — nothing here publishes without editorial and clinical review."
      >
        <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
        </button>
        <Link className="btn btn-primary btn-sm" href={tabPath}>
          Back to {tabLabel}
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon="⏳" label="Running jobs" value={String(jobCounts.running)} variant="blue" />
        <KpiCard icon="🕵️" label="Awaiting review" value={String(jobCounts.review)} variant="amber" />
        <KpiCard icon="✖" label="Failed" value={String(jobCounts.failed)} variant="red" />
        <KpiCard icon="🔗" label="Indexed source links" value={String(sourceLinks)} variant="teal" />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-500/15 p-3 text-xs text-red-900 dark:text-red-400" role="alert">
          {error}
        </div>
      )}

      <div
        className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-500/15 p-3 text-xs text-blue-950 dark:text-blue-400"
        role="note"
      >
        <strong>This page is the audit trail.</strong> To start a run —{" "}
        {scope === "trivia"
          ? "schedule an event, add a reward, write or generate questions"
          : "write an article, or generate and curate drafts"}{" "}
        — use <strong>{createLabel}</strong> on the{" "}
        <Link className="underline" href={tabPath}>
          Period {tabLabel} tab
        </Link>
        .
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Job history</div>
            <div className="mt-1 text-2xs text-slate-500">
              Newest first. A failed job keeps the model&apos;s actual output and the
              reason it did not pass validation, so it stays debuggable.
            </div>
          </div>
          <span className="badge badge-blue">{scopedJobs.length} runs</span>
        </div>
        <DataTable
          caption="AI job history"
          columns={jobColumns}
          data={scopedJobs}
          pagination={false}
          getRowId={(row) => row.id}
        />
      </div>
    </div>
  );
}
