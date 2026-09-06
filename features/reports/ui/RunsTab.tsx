"use client";

/**
 * Run History tab (reports.manage) — every run across schedules with its
 * pipeline status, retry for failures, and the honesty trail (which runs
 * shipped metrics-only, which were AI-narrated, which sections awaited
 * data).
 */

import React, { useState } from "react";
import { History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useReportDefinitions,
  useReportRuns,
  useReportsMutations,
} from "@/features/reports/data/useReports";

const STATUS_TONE: Record<string, string> = {
  queued: "bg-slate-100 text-slate-600",
  collecting: "bg-blue-50 text-blue-600",
  narrating: "bg-violet-50 text-violet-600",
  delivered: "bg-emerald-50 text-emerald-700",
  delivered_metrics_only: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-600",
};

export default function RunsTab() {
  const { data: defData } = useReportDefinitions(true);
  const definitions = defData?.definitions ?? [];
  const [definitionId, setDefinitionId] = useState<string>("");
  const { data, isLoading, refetch } = useReportRuns(definitionId || null, true);
  const m = useReportsMutations();

  const names = new Map(definitions.map((d) => [d.id, d.name]));
  const runs = data?.runs ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Filter</span>
        <select
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm min-w-[220px]"
          value={definitionId}
          onChange={(e) => setDefinitionId(e.target.value)}>
          <option value="">All schedules</option>
          {definitions.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>Refresh</Button>
      </div>

      {isLoading ? (
        <div className="card py-14 text-center text-xs font-bold uppercase tracking-widest text-slate-400">Loading run history…</div>
      ) : !runs.length ? (
        <Card>
          <CardContent className="py-14 text-center">
            <History className="h-8 w-8 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-700">No runs yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Runs appear when a schedule fires (hourly worker) or via Generate now.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Schedule</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Narrative</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="font-bold text-slate-800">
                    {names.get(run.definition_id) ?? "—"}
                    <span className="text-[10px] text-slate-400 ml-1.5 capitalize">{run.cadence}</span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {run.period_start} → {run.period_end}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-md text-[11px] font-bold ${STATUS_TONE[run.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {run.status.replace(/_/g, " ")}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {run.status === "failed" ? (
                      <span className="text-red-500" title={run.error ?? undefined}>
                        {(run.error ?? "error").slice(0, 42)}
                      </span>
                    ) : run.narrative_model ? (
                      `AI (${run.narrative_model})`
                    ) : (
                      "Metrics only"
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{new Date(run.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {["failed", "queued"].includes(run.status) ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={m.retryRun.isPending}
                        onClick={async () => {
                          try {
                            const res = await m.retryRun.mutateAsync(run.id);
                            const status = (res as { status?: string }).status;
                            if (status === "failed") toast.error("Retry failed again — see the error column.");
                            else toast.success(`Run ${status}`);
                          } catch (err) {
                            toast.error((err as Error).message);
                          }
                        }}>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
