"use client";

/**
 * Reports inbox — reports delivered to the signed-in admin. Sections the
 * super admin redacted for this recipient never arrive here (the API
 * strips them), and every AI-written report carries its provenance label.
 */

import React, { Fragment, useState } from "react";
import { Bot, FileBarChart2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReportInbox, type ReportRun, type SectionResult } from "@/features/reports/data/useReports";

const SECTION_LABELS: Record<string, string> = {
  users: "Users & Growth",
  traction: "Mobile App Traction",
  admin_activity: "Admin Performance & Tasks",
  security: "Security Posture",
  finance: "Finance",
  ai: "AI Hub Usage",
  marketing: "Campaigns & Outreach",
};

/** Minimal, safe markdown → JSX (headings, bullets, bold). No HTML pass-through. */
function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = (key: string) => {
    if (!listBuffer.length) return;
    nodes.push(
      <ul key={key} className="list-disc pl-5 space-y-1 my-2 text-sm text-slate-700 dark:text-slate-300">
        {listBuffer.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>,
    );
    listBuffer = [];
  };

  const renderInline = (line: string): React.ReactNode => {
    const parts = line.split(/\*\*(.+?)\*\*/g);
    return (
      <>
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <strong key={i} className="font-bold text-slate-900 dark:text-slate-100">
              {part}
            </strong>
          ) : (
            <Fragment key={i}>{part}</Fragment>
          ),
        )}
      </>
    );
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd();
    if (/^[-*] /.test(line.trim())) {
      listBuffer.push(line.trim().replace(/^[-*] /, ""));
      return;
    }
    flushList(`list-${idx}`);
    if (!line.trim()) return;
    if (line.startsWith("### ")) {
      nodes.push(
        <h4 key={idx} className="text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 mt-4 mb-1">
          {line.slice(4)}
        </h4>,
      );
    } else if (line.startsWith("## ")) {
      nodes.push(
        <h3 key={idx} className="text-base font-black text-slate-900 dark:text-slate-100 mt-4 mb-1 first:mt-0">
          {line.slice(3)}
        </h3>,
      );
    } else if (line.startsWith("# ")) {
      nodes.push(
        <h3 key={idx} className="text-base font-black text-slate-900 dark:text-slate-100 mt-2 mb-1">
          {line.slice(2)}
        </h3>,
      );
    } else {
      nodes.push(
        <p key={idx} className="text-sm leading-6 text-slate-700 dark:text-slate-300 my-1">
          {renderInline(line)}
        </p>,
      );
    }
  });
  flushList("list-end");
  return <>{nodes}</>;
}

function MetricsGrid({ metrics }: { metrics: Record<string, SectionResult> }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
      {Object.entries(metrics).map(([key, section]) => (
        <div key={key} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">
              {SECTION_LABELS[key] ?? key}
            </span>
            {section.status === "awaiting" ? (
              <Badge variant="secondary">Awaiting data</Badge>
            ) : (
              <Badge variant="outline">Live</Badge>
            )}
          </div>
          {section.status === "awaiting" ? (
            <p className="text-xs text-slate-500">{section.note ?? "Source not live yet."}</p>
          ) : (
            <div className="space-y-1">
              {Object.entries(section.metrics).map(([metric, value]) => {
                const movement =
                  value.previous != null && value.current != null && value.previous > 0
                    ? Math.round(((value.current - value.previous) / value.previous) * 100)
                    : null;
                return (
                  <div key={metric} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 capitalize">{metric.replace(/_/g, " ")}</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {value.current ?? "n/a"}
                      {movement != null && movement !== 0 ? (
                        <span className={`ml-1.5 font-semibold ${movement > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                          {movement > 0 ? "+" : ""}
                          {movement}%
                        </span>
                      ) : null}
                    </span>
                  </div>
                );
              })}
              {section.note ? <p className="text-xs text-slate-400 pt-1">{section.note}</p> : null}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RunCard({ run }: { run: ReportRun }) {
  const [expanded, setExpanded] = useState(false);
  const failed = run.status === "failed";
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileBarChart2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              {run.definitionName ?? "Platform Report"}
              <Badge variant="outline" className="capitalize">{run.cadence}</Badge>
              {failed ? <Badge variant="destructive">Failed</Badge> : null}
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              {run.period_start} → {run.period_end} · generated{" "}
              {new Date(run.completed_at ?? run.created_at).toLocaleString()}
              {run.narrative_model ? (
                <span className="inline-flex items-center gap-1 ml-2 text-violet-600 font-semibold">
                  <Bot className="h-3 w-3" /> AI summary ({run.narrative_model})
                </span>
              ) : (
                <span className="ml-2 text-slate-400">metrics only</span>
              )}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Collapse" : "Details"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {failed ? (
          <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/15 border border-red-100 dark:border-red-500/30 rounded-lg p-3">
            {run.error ?? "Run failed without an error message."}
          </p>
        ) : run.narrative_md ? (
          <MarkdownLite text={run.narrative_md} />
        ) : null}

        {!run.narrative_model && !failed ? (
          <p className="text-2xs text-slate-400 mt-3 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            All figures are computed directly from platform data; no AI narrative was generated for this run.
          </p>
        ) : null}
        {run.narrative_model ? (
          <p className="text-2xs text-slate-400 mt-3">
            Narrative generated by {run.narrative_model} from deterministic platform metrics. Figures are never
            AI-invented — verify any decision-critical number against the tables below.
          </p>
        ) : null}

        {expanded && run.metrics ? <MetricsGrid metrics={run.metrics} /> : null}
      </CardContent>
    </Card>
  );
}

export default function InboxTab() {
  const { data, isLoading, isError, error, refetch } = useReportInbox();

  if (isLoading) {
    return <div className="card py-16 text-center text-xs font-bold uppercase tracking-widest text-slate-400">Loading your reports…</div>;
  }
  if (isError) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Could not load reports</p>
          <p className="text-xs text-slate-500 mb-4">
            {(error as Error).message.includes("does not exist") || (error as Error).message.includes("could not find")
              ? "The reports migration has not been applied to the database yet."
              : (error as Error).message}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const runs = data?.runs ?? [];
  if (!runs.length) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <FileBarChart2 className="h-8 w-8 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No reports delivered yet</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Once the super admin subscribes you to a report schedule, generated reports land here on their delivery
            day. Nothing to configure on your side.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {runs.map((run) => (
        <RunCard key={run.id} run={run} />
      ))}
    </div>
  );
}
