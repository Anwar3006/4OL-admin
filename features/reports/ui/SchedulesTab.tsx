"use client";

/**
 * Schedules tab (reports.manage) — super admin creates/edits report
 * definitions: cadence, sections, timezone, delivery hour, AI toggle.
 */

import React, { useState } from "react";
import { CalendarClock, Play, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  useReportMeta,
  useReportsMutations,
  type ReportDefinition,
  type ReportSectionKey,
} from "@/features/reports/data/useReports";

const SECTION_LABELS: Record<ReportSectionKey, string> = {
  users: "Users & Growth",
  traction: "Mobile App Traction",
  admin_activity: "Admin Performance & Tasks",
  security: "Security Posture",
  finance: "Finance",
  ai: "AI Hub Usage",
  marketing: "Campaigns & Outreach",
};

interface DraftState {
  definitionId?: string;
  name: string;
  cadence: string;
  sections: ReportSectionKey[];
  timezone: string;
  deliveryHour: number;
  aiNarrative: boolean;
  enabled: boolean;
}

const EMPTY_DRAFT: DraftState = {
  name: "",
  cadence: "weekly",
  sections: ["users", "traction", "admin_activity", "security"],
  timezone: "Africa/Accra",
  deliveryHour: 7,
  aiNarrative: true,
  enabled: true,
};

function DefinitionForm({
  draft,
  onChange,
  aiConfigured,
}: {
  draft: DraftState;
  onChange: (next: DraftState) => void;
  aiConfigured: boolean;
}) {
  const toggleSection = (section: ReportSectionKey) => {
    const has = draft.sections.includes(section);
    onChange({
      ...draft,
      sections: has ? draft.sections.filter((s) => s !== section) : [...draft.sections, section],
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Report name</Label>
          <Input
            value={draft.name}
            placeholder="e.g. Weekly Platform Pulse"
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Cadence</Label>
          <select
            className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
            value={draft.cadence}
            onChange={(e) => onChange({ ...draft, cadence: e.target.value })}>
            {["daily", "weekly", "monthly", "quarterly", "yearly"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Timezone</Label>
          <Input
            value={draft.timezone}
            onChange={(e) => onChange({ ...draft, timezone: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Delivery hour (0–23)</Label>
          <Input
            type="number"
            min={0}
            max={23}
            value={draft.deliveryHour}
            onChange={(e) => onChange({ ...draft, deliveryHour: Math.max(0, Math.min(23, Number(e.target.value) || 0)) })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Sections included</Label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SECTION_LABELS) as ReportSectionKey[]).map((section) => {
            const active = draft.sections.includes(section);
            return (
              <button
                key={section}
                type="button"
                onClick={() => toggleSection(section)}
                className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-colors ${
                  active
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-300"
                }`}>
                {SECTION_LABELS[section]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-6 pt-1">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={draft.aiNarrative}
            onChange={(e) => onChange({ ...draft, aiNarrative: e.target.checked })}
          />
          AI narrative
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => onChange({ ...draft, enabled: e.target.checked })}
          />
          Schedule enabled
        </label>
      </div>
      {!aiConfigured ? (
        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 rounded-lg p-2.5">
          OPENAI_API_KEY is not configured on this deployment — runs ship as metrics-only reports until it is set.
        </p>
      ) : null}
    </div>
  );
}

export default function SchedulesTab() {
  const meta = useReportMeta();
  const { data, isLoading } = useReportDefinitions(true);
  const m = useReportsMutations();
  const [draft, setDraft] = useState<DraftState | null>(null);

  const definitions = data?.definitions ?? [];

  const save = async () => {
    if (!draft) return;
    if (draft.name.trim().length < 3) return toast.error("Give the report a name (3+ characters).");
    if (!draft.sections.length) return toast.error("Pick at least one section.");
    try {
      await m.saveDefinition.mutateAsync({
        definitionId: draft.definitionId,
        definition: {
          name: draft.name.trim(),
          cadence: draft.cadence,
          sections: draft.sections,
          timezone: draft.timezone.trim() || "Africa/Accra",
          deliveryHour: draft.deliveryHour,
          aiNarrative: draft.aiNarrative,
          enabled: draft.enabled,
        },
      });
      toast.success(draft.definitionId ? "Schedule updated" : "Schedule created");
      setDraft(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {meta.data?.aiConfigured
            ? `AI narration via ${meta.data.aiModel} · deterministic metrics, AI-written summary`
            : "AI narration not configured — reports deliver metrics only"}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={m.processQueue.isPending}
            onClick={async () => {
              try {
                const res = await m.processQueue.mutateAsync();
                toast.success(`Processed ${(res as { processed?: number }).processed ?? 0} queued run(s)`);
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Process queue
          </Button>
          <Button size="sm" onClick={() => setDraft(EMPTY_DRAFT)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New report schedule
          </Button>
        </div>
      </div>

      {draft ? (
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-4">
              {draft.definitionId ? "Edit schedule" : "New schedule"}
            </h3>
            <DefinitionForm draft={draft} onChange={setDraft} aiConfigured={Boolean(meta.data?.aiConfigured)} />
            <div className="flex gap-2 mt-5">
              <Button size="sm" disabled={m.saveDefinition.isPending} onClick={save}>
                {m.saveDefinition.isPending ? "Saving…" : "Save schedule"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="card py-14 text-center text-xs font-bold uppercase tracking-widest text-slate-400">Loading schedules…</div>
      ) : !definitions.length ? (
        <Card>
          <CardContent className="py-14 text-center">
            <CalendarClock className="h-8 w-8 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No report schedules yet</p>
            <p className="text-xs text-slate-500 mt-1">Create the first schedule — e.g. a weekly platform pulse for the leadership team.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Cadence</TableHead>
                <TableHead>Sections</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Next run</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {definitions.map((definition: ReportDefinition) => (
                <TableRow key={definition.id}>
                  <TableCell className="font-bold text-slate-800 dark:text-slate-200">
                    {definition.name}
                    {!definition.enabled ? <Badge variant="secondary" className="ml-2">Paused</Badge> : null}
                  </TableCell>
                  <TableCell className="capitalize">{definition.cadence}</TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-500">
                      {definition.sections.map((s) => SECTION_LABELS[s] ?? s).join(" · ")}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {String(definition.delivery_hour).padStart(2, "0")}:00 {definition.timezone}
                    {!definition.ai_narrative ? <Badge variant="outline" className="ml-2">metrics only</Badge> : null}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {definition.next_run_at ? new Date(definition.next_run_at).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Generate now"
                        disabled={m.generateNow.isPending}
                        onClick={async () => {
                          try {
                            const res = await m.generateNow.mutateAsync(definition.id);
                            const status = (res as { status?: string }).status;
                            if (status === "failed") toast.error("Run completed but failed — check Run History.");
                            else toast.success(`Report generated (${status})`);
                          } catch (err) {
                            toast.error((err as Error).message);
                          }
                        }}>
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Edit"
                        onClick={() =>
                          setDraft({
                            definitionId: definition.id,
                            name: definition.name,
                            cadence: definition.cadence,
                            sections: definition.sections,
                            timezone: definition.timezone,
                            deliveryHour: definition.delivery_hour,
                            aiNarrative: definition.ai_narrative,
                            enabled: definition.enabled,
                          })
                        }>
                        ✏️
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Delete"
                        onClick={async () => {
                          if (!confirm(`Delete "${definition.name}" and its run history?`)) return;
                          try {
                            await m.deleteDefinition.mutateAsync(definition.id);
                            toast.success("Schedule deleted");
                          } catch (err) {
                            toast.error((err as Error).message);
                          }
                        }}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
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
