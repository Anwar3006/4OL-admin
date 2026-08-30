"use client";

/**
 * Recipients tab (reports.manage) — who receives which report, on which
 * channel, with optional per-recipient section redaction (e.g. hide the
 * Finance section from non-finance roles).
 */

import React, { useEffect, useMemo, useState } from "react";
import { UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useReportAdmins,
  useReportDefinitions,
  useReportRecipients,
  useReportsMutations,
  type ReportSectionKey,
} from "@/hooks/supabase-calls/useReports";

const SECTION_LABELS: Record<ReportSectionKey, string> = {
  users: "Users & Growth",
  traction: "Mobile App Traction",
  admin_activity: "Admin Performance & Tasks",
  security: "Security Posture",
  finance: "Finance",
  ai: "AI Hub Usage",
  marketing: "Campaigns & Outreach",
};

interface RecipientDraft {
  adminId: string;
  channels: string[];
  redactedSections: ReportSectionKey[];
}

export default function RecipientsTab() {
  const { data: defData } = useReportDefinitions(true);
  const definitions = defData?.definitions ?? [];
  const [definitionId, setDefinitionId] = useState<string | null>(null);
  useEffect(() => {
    if (!definitionId && definitions.length) setDefinitionId(definitions[0].id);
  }, [definitions, definitionId]);

  const definition = definitions.find((d) => d.id === definitionId) ?? null;
  const { data: recipientsData, isLoading } = useReportRecipients(definitionId);
  const { data: adminsData } = useReportAdmins(true);
  const m = useReportsMutations();

  const admins = adminsData?.admins ?? [];
  const [drafts, setDrafts] = useState<RecipientDraft[]>([]);
  useEffect(() => {
    setDrafts(
      (recipientsData?.recipients ?? []).map((r) => ({
        adminId: r.admin_id,
        channels: r.channels,
        redactedSections: r.redacted_sections,
      })),
    );
  }, [recipientsData]);

  const adminLabel = useMemo(
    () => new Map(admins.map((a) => [a.id, a.email ?? a.id.slice(0, 8)])),
    [admins],
  );
  const definitionSections = definition?.sections ?? [];

  const update = (index: number, patch: Partial<RecipientDraft>) =>
    setDrafts((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const save = async () => {
    if (!definitionId) return;
    const invalid = drafts.some((d) => !d.adminId);
    if (invalid) return toast.error("Every recipient row needs an admin selected.");
    try {
      await m.setRecipients.mutateAsync({ definitionId, recipients: drafts });
      toast.success("Recipients saved");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (!definitions.length) {
    return (
      <Card>
        <CardContent className="py-14 text-center">
          <Users className="h-8 w-8 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-700">Create a report schedule first</p>
          <p className="text-xs text-slate-500 mt-1">Recipients are attached to a schedule — create one in the Schedules tab.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Schedule</span>
        <select
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm min-w-[240px]"
          value={definitionId ?? ""}
          onChange={(e) => setDefinitionId(e.target.value)}>
          {definitions.map((d) => (
            <option key={d.id} value={d.id}>{d.name} ({d.cadence})</option>
          ))}
        </select>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDrafts((rows) => [...rows, { adminId: "", channels: ["inbox"], redactedSections: [] }])}>
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          Add recipient
        </Button>
        <Button size="sm" disabled={m.setRecipients.isPending} onClick={save}>
          {m.setRecipients.isPending ? "Saving…" : "Save recipients"}
        </Button>
      </div>

      {isLoading ? (
        <div className="card py-14 text-center text-xs font-bold uppercase tracking-widest text-slate-400">Loading recipients…</div>
      ) : !drafts.length ? (
        <Card>
          <CardContent className="py-14 text-center">
            <Users className="h-8 w-8 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-700">Nobody receives this report yet</p>
            <p className="text-xs text-slate-500 mt-1">Add admins — they will see the report in their Reports inbox on delivery day.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {drafts.map((row, index) => (
            <Card key={index}>
              <CardContent className="pt-5 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm min-w-[220px]"
                    value={row.adminId}
                    onChange={(e) => update(index, { adminId: e.target.value })}>
                    <option value="">Select admin…</option>
                    {admins.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.email ?? admin.id.slice(0, 8)} ({admin.role})
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                    {["inbox", "email"].map((channel) => (
                      <label key={channel} className="flex items-center gap-1.5 capitalize">
                        <input
                          type="checkbox"
                          checked={row.channels.includes(channel)}
                          onChange={(e) =>
                            update(index, {
                              channels: e.target.checked
                                ? [...row.channels, channel]
                                : row.channels.filter((c) => c !== channel),
                            })
                          }
                        />
                        {channel}
                        {channel === "email" ? <Badge variant="secondary">soon</Badge> : null}
                      </label>
                    ))}
                  </div>

                  <div className="flex-1" />
                  <Button variant="ghost" size="sm" onClick={() => setDrafts((rows) => rows.filter((_, i) => i !== index))}>
                    Remove
                  </Button>
                </div>

                {definitionSections.length ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mr-1">
                      Hide sections for this recipient:
                    </span>
                    {definitionSections.map((section) => {
                      const hidden = row.redactedSections.includes(section);
                      return (
                        <button
                          key={section}
                          type="button"
                          onClick={() =>
                            update(index, {
                              redactedSections: hidden
                                ? row.redactedSections.filter((s) => s !== section)
                                : [...row.redactedSections, section],
                            })
                          }
                          className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${
                            hidden
                              ? "bg-red-50 border-red-200 text-red-600"
                              : "bg-white border-slate-200 text-slate-500 hover:border-red-200"
                          }`}>
                          {hidden ? "🙈 " : ""}
                          {SECTION_LABELS[section] ?? section}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
