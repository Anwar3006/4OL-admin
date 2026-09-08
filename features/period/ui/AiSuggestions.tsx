"use client";

import React, { useState } from "react";
import type { Row } from "@/features/period/schema/types";
import { date, dateTime, shortId, status } from "./formatters";


export default function AiSuggestions({
  suggestions,
  saving,
  mutate,
}: {
  suggestions: Row[];
  saving: boolean;
  mutate: (body: Record<string, unknown>, success: string) => Promise<void>;
}) {
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const reviewQueue = suggestions.filter((item) => item.status === "review");
  return (
    <section
      className="card overflow-hidden"
      aria-labelledby="ai-suggestions-heading"
    >
      <div className="card-header">
        <div>
          <h3 id="ai-suggestions-heading" className="card-title">
            AI content suggestions
          </h3>
          <p className="text-2xs text-slate-500">
            Grounded in approved encyclopedia sources (Diseases &amp;
            Conditions, Symptoms, Healthy Living). Admin sets the schedule
            date, frequency cap and duration — AI never self-publishes.
          </p>
        </div>
        <span className="badge badge-blue">
          {reviewQueue.length} awaiting review
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b bg-slate-50 dark:bg-slate-900">
              <th className="p-3">Job</th>
              <th className="p-3">Sources</th>
              <th className="p-3">Status</th>
              <th className="p-3">Schedule</th>
              <th className="p-3">Frequency cap</th>
              <th className="p-3">Duration</th>
              <th className="p-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {suggestions.slice(0, 20).map((item) => (
              <React.Fragment key={item.id}>
                <tr className="border-b">
                  <td className="p-3">
                    <div className="font-medium">
                      {String(item.job_type ?? "").replaceAll("_", " ")}
                    </div>
                    <div className="text-2xs text-slate-500">
                      {dateTime(item.created_at)} ·{" "}
                      <code className="text-xs">{shortId(item.id)}</code>
                    </div>
                  </td>
                  <td className="p-3 text-2xs">
                    {(item.source_menus ?? []).join(", ") || "—"}
                  </td>
                  <td className="p-3">{status(item.status)}</td>
                  <td className="p-3">{dateTime(item.scheduled_at)}</td>
                  <td className="p-3">
                    {item.frequency_cap_days
                      ? `1 per ${item.frequency_cap_days} days`
                      : "—"}
                  </td>
                  <td className="p-3">
                    {item.surface_duration_weeks
                      ? `${item.surface_duration_weeks} weeks`
                      : "—"}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        setSchedulingId(
                          schedulingId === item.id ? null : item.id,
                        )
                      }
                    >
                      {schedulingId === item.id ? "Close" : "Schedule"}
                    </button>
                  </td>
                </tr>
                {schedulingId === item.id && (
                  <tr className="border-b bg-slate-50 dark:bg-slate-900">
                    <td colSpan={7} className="p-3">
                      <form
                        className="grid grid-cols-1 gap-3 md:grid-cols-5"
                        aria-label="Schedule AI suggestion"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const form = new FormData(event.currentTarget);
                          const raw = String(form.get("scheduledAt") ?? "");
                          if (!raw) return;
                          mutate(
                            {
                              action: "schedule_ai_suggestion",
                              jobId: item.id,
                              scheduledAt: new Date(raw).toISOString(),
                              frequencyCapDays: Number(form.get("frequencyCapDays")),
                              surfaceDurationWeeks: Number(form.get("surfaceDurationWeeks")),
                              surfaceChannel: form.get("surfaceChannel"),
                            },
                            "Suggestion scheduled. Clinical sign-off is still required before the publish date.",
                          );
                          setSchedulingId(null);
                        }}
                      >
                        <label className="form-label">
                          Schedule date
                          <input
                            name="scheduledAt"
                            type="datetime-local"
                            required
                            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
                          />
                        </label>
                        <label className="form-label">
                          Frequency cap
                          <select
                            name="frequencyCapDays"
                            defaultValue="14"
                            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
                          >
                            <option value="7">1 per 7 days</option>
                            <option value="14">1 per 14 days</option>
                            <option value="30">1 per 30 days</option>
                          </select>
                        </label>
                        <label className="form-label">
                          Duration on surface
                          <select
                            name="surfaceDurationWeeks"
                            defaultValue="2"
                            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
                          >
                            <option value="1">1 week</option>
                            <option value="2">2 weeks</option>
                            <option value="4">4 weeks</option>
                          </select>
                        </label>
                        <label className="form-label">
                          Target surface
                          <select
                            name="surfaceChannel"
                            defaultValue="plasence_library"
                            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
                          >
                            <option value="plasence_library">Library — Featured</option>
                            <option value="push_digest">Push digest</option>
                            <option value="today_tip">Today screen tip</option>
                          </select>
                        </label>
                        <div className="flex items-end">
                          <button
                            type="submit"
                            className="btn btn-primary btn-sm"
                            disabled={saving}
                          >
                            {saving ? "Saving…" : "Save schedule"}
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {!suggestions.length && (
              <tr>
                <td colSpan={7} className="p-4 text-slate-500">
                  No AI content suggestions yet. Request one from the AI
                  workspace.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
