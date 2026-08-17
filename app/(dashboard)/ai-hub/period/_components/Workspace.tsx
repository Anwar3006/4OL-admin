"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import DataTable, { type Column } from "@/components/redesign/DataTable";
import KpiCard from "@/components/redesign/KpiCard";
import PageHeader from "@/components/redesign/PageHeader";
import TopicCategorySelect from "@/components/period_tracker/TopicCategorySelect";
import { cn } from "@/lib/utils";

type Row = Record<string, any>;
type Scope = "trivia" | "content";

const SOURCE_MENUS = [
  { value: "healthy_living", label: "Healthy Living" },
  { value: "conditions", label: "Conditions" },
  { value: "symptoms", label: "Symptoms" },
] as const;

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
  { key: "model_key", label: "Model" },
  { key: "error_code", label: "Error", render: (value) => value || "—" },
  { key: "created_at", label: "Started", render: dateTime },
  { key: "completed_at", label: "Completed", render: dateTime },
];

export default function AiHubPeriodWorkspace({ scope }: { scope: Scope }) {
  const jobTypes = scope === "trivia" ? (["trivia_generation", "engagement_copy"] as const) : (["content_curation", "content_suggestion"] as const);
  const [jobType, setJobType] = useState<string>(jobTypes[0]);
  const [sourceMenus, setSourceMenus] = useState<string[]>(["healthy_living"]);
  const [jobs, setJobs] = useState<Row[]>([]);
  const [events, setEvents] = useState<Row[]>([]);
  const [leads, setLeads] = useState<Row[]>([]);
  const [sourceLinks, setSourceLinks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [schedulingEvent, setSchedulingEvent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastOutput, setLastOutput] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai-hub/period", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Unable to load the AI workspace");
      setJobs(result.jobs ?? []);
      setEvents(result.events ?? []);
      setLeads(result.leads ?? []);
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

  const scopedJobs = useMemo(() => jobs.filter((job) => (jobTypes as readonly string[]).includes(job.job_type)), [jobs, jobTypes]);
  const jobCounts = useMemo(() => {
    const counts = { running: 0, review: 0, failed: 0 };
    for (const job of scopedJobs) {
      if (job.status === "running") counts.running += 1;
      else if (job.status === "review") counts.review += 1;
      else if (job.status === "failed") counts.failed += 1;
    }
    return counts;
  }, [scopedJobs]);

  const toggleSourceMenu = (value: string) => {
    setSourceMenus((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  };

  const generate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sourceMenus.length) {
      setError("Select at least one source menu.");
      return;
    }
    const form = new FormData(event.currentTarget);
    setGenerating(true);
    setError(null);
    setMessage(null);
    setLastOutput(null);
    try {
      const body: Record<string, unknown> = { jobType, sourceMenus, topic: form.get("topic") || undefined };
      if (scope === "trivia") {
        if (jobType === "trivia_generation") {
          body.difficulty = form.get("difficulty");
          body.answerCount = Number(form.get("answerCount"));
          const eventId = form.get("eventId");
          if (eventId) body.eventId = eventId;
        }
      } else {
        body.contentFormat = form.get("contentFormat");
        body.audience = form.get("audience");
        body.tone = form.get("tone");
        body.readingLength = form.get("readingLength");
        body.locale = form.get("locale") || "en";
        body.suggestionCount = Number(form.get("suggestionCount"));
      }
      const response = await fetch("/api/ai-hub/period", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Generation failed");
      setLastOutput(result);
      setMessage(`Draft ready for review: ${result.itemCount} item${result.itemCount === 1 ? "" : "s"} generated.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const scheduleEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const startsAt = form.get("startsAt") ? new Date(String(form.get("startsAt"))).toISOString() : null;
    const endsAt = form.get("endsAt") ? new Date(String(form.get("endsAt"))).toISOString() : null;
    if (!startsAt || !endsAt) {
      setError("A start and end time are required.");
      return;
    }
    setSchedulingEvent(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/period/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_trivia_event", title: form.get("title"), startsAt, endsAt, timezone: form.get("timezone") || "Africa/Accra" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Unable to schedule this event");
      setMessage("Friday Trivia event scheduled as a draft.");
      (event.target as HTMLFormElement).reset();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to schedule this event");
    } finally {
      setSchedulingEvent(false);
    }
  };

  return (
    <div className="page space-y-4">
      <PageHeader
        title={scope === "trivia" ? "AI Hub · Period Trivia & Engagement" : "AI Hub · Period Content"}
        subtitle="Source-grounded drafts only — every item requires editorial and clinical review before it publishes."
      >
        <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
        </button>
        <Link className="btn btn-secondary btn-sm" href={`/period?tab=${scope === "trivia" ? "trivia" : "content"}`}>
          Back to Period Tracker
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard icon="⏳" label="Running jobs" value={String(jobCounts.running)} variant="blue" />
        <KpiCard icon="🕵️" label="Awaiting review" value={String(jobCounts.review)} variant="amber" />
        <KpiCard icon="🔗" label="Indexed source links" value={String(sourceLinks)} variant="teal" />
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900" role="alert">{error}</div>}
      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">{message}</div>}

      <form className="card space-y-3 p-4" onSubmit={generate} aria-label="Generate an AI draft">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="form-label">
            Draft type
            <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={jobType} onChange={(event) => setJobType(event.target.value)}>
              {jobTypes.map((type) => (
                <option key={type} value={type}>{type.replaceAll("_", " ")}</option>
              ))}
            </select>
          </label>
          {scope === "content" ? (
            <TopicCategorySelect name="topic" label="Topic (optional)" />
          ) : (
            <label className="form-label">
              Topic (optional)
              <input name="topic" maxLength={120} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="e.g. luteal phase nutrition" />
            </label>
          )}
        </div>

        <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <legend className="form-label mb-1">Approved source menus</legend>
          {SOURCE_MENUS.map((menu) => (
            <label key={menu.value} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={sourceMenus.includes(menu.value)} onChange={() => toggleSourceMenu(menu.value)} />
              {menu.label}
            </label>
          ))}
        </fieldset>

        {scope === "trivia" && jobType === "trivia_generation" && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="form-label">
              Difficulty
              <select name="difficulty" defaultValue="intermediate" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
            <label className="form-label">
              Answers per question
              <input name="answerCount" type="number" min={2} max={6} defaultValue={4} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="form-label">
              Attach to event (optional)
              <select name="eventId" defaultValue="" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">Unattached draft</option>
                {events.filter((item) => item.status === "draft").map((item) => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        {scope === "content" && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="form-label">
              Format
              <select name="contentFormat" defaultValue="quick_read" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="article">Article</option>
                <option value="quick_read">Quick read</option>
                <option value="video">Video</option>
                <option value="podcast">Podcast</option>
                <option value="expert_qa">Expert Q&amp;A</option>
              </select>
            </label>
            <label className="form-label">
              Audience
              <select name="audience" defaultValue="general" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="general">General</option>
                <option value="teens">Teens</option>
                <option value="adults">Adults</option>
                <option value="caregivers">Caregivers</option>
              </select>
            </label>
            <label className="form-label">
              Tone
              <select name="tone" defaultValue="supportive" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="supportive">Supportive</option>
                <option value="educational">Educational</option>
                <option value="concise">Concise</option>
              </select>
            </label>
            <label className="form-label">
              Reading length
              <select name="readingLength" defaultValue="medium" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
            </label>
            <label className="form-label">
              Locale
              <input name="locale" defaultValue="en" maxLength={12} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="form-label">
              Draft count
              <input name="suggestionCount" type="number" min={1} max={12} defaultValue={8} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary btn-sm" disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Generating…" : "Generate draft"}
          </button>
        </div>
      </form>

      {lastOutput && (
        <div className="card p-4 text-sm text-slate-700">
          <div className="card-title">{lastOutput.output?.title ?? "Generation result"}</div>
          <p className="mt-1 text-xs text-slate-500">{lastOutput.output?.rationale}</p>
          <p className="mt-2">{lastOutput.itemCount} item(s) saved as drafts — review and publish them from the Period Tracker admin tabs.</p>
        </div>
      )}

      {scope === "trivia" && (
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="card p-4" aria-labelledby="schedule-event-heading">
            <h3 id="schedule-event-heading" className="card-title">Schedule a Friday Trivia event</h3>
            <p className="mt-1 text-xs text-slate-500">Must start on a Friday. Questions can be attached above once scheduled.</p>
            <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={scheduleEvent} aria-label="Schedule a Friday Trivia event">
              <label className="form-label sm:col-span-2">
                Title
                <input name="title" required minLength={3} maxLength={160} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
              <label className="form-label">
                Starts (Friday)
                <input name="startsAt" type="datetime-local" required className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
              <label className="form-label">
                Ends
                <input name="endsAt" type="datetime-local" required className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
              <label className="form-label sm:col-span-2">
                Timezone
                <input name="timezone" defaultValue="Africa/Accra" maxLength={80} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
              <button type="submit" className="btn btn-primary btn-sm sm:col-span-2" disabled={schedulingEvent}>
                {schedulingEvent ? "Scheduling…" : "Schedule event"}
              </button>
            </form>
          </section>

          <section className="card overflow-hidden" aria-labelledby="leads-heading">
            <div className="card-header">
              <div>
                <h3 id="leads-heading" className="card-title">Recent Trivia leads</h3>
                <p className="text-xs text-slate-500">Full detail and masking lives in the Period Tracker Trivia tab.</p>
              </div>
              <span className="badge badge-blue">{leads.length} records</span>
            </div>
            <div className="max-h-64 overflow-y-auto p-4 text-sm text-slate-600">
              {leads.slice(0, 10).map((lead) => (
                <div key={lead.id} className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0">
                  <span>{lead.acquisition_source?.replaceAll("_", " ")}</span>
                  {statusBadge(lead.status)}
                </div>
              ))}
              {!leads.length && <p className="text-slate-500">No leads yet.</p>}
            </div>
          </section>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Job history</div>
            <div className="mt-1 text-xs text-slate-500">Every generation run is audited here, including failures.</div>
          </div>
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
