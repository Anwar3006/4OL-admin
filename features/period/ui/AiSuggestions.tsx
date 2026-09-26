"use client";

/**
 * AI content suggestions queue -- one row per article, scheduled per article.
 *
 * Two rewrites got us here. It first listed one row per *job* ("content_
 * suggestion, 3 sources, review"), which told you a run happened but never
 * what it produced. Then it flattened job output JSON into per-suggestion
 * rows, which read correctly but could not be acted on, because the drafts
 * it was describing already existed as real period_content rows with ids.
 *
 * It now reads those rows (see the content tab in ../api/data-get.ts), so
 * Schedule targets one article and writes the publication row the mobile
 * feed actually queries.
 *
 * What scheduling means, in one place, because it is not obvious from the
 * column names:
 *   - Schedule date -- nobody sees the article until this moment.
 *   - Promotion window -- how long it rides the Library carousel and/or the
 *     Today "For You" row. When it ends the article is DEMOTED, not removed:
 *     still published, still searchable, still there for anyone who
 *     bookmarked it. "Permanent" never demotes.
 *   - Surfaces -- which of those two places promote it.
 *   - Frequency cap -- how long before the same user may be re-promoted it.
 */

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Bot,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Infinity,
  Link2,
  Pause,
  Pencil,
  Play,
  Sparkles,
  Stethoscope,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Row } from "@/features/period/schema/types";
import { dateTime } from "./formatters";
import { darkPill, neutralPill } from "./pills";

const FIELD =
  "mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs";

// `.bbl`, `.bpu`, `.bt` and `.by` are referenced across the Period tables but
// have no rule in app/globals.css — of the shorthand badges only the base `.b`
// is global now (the colour modifiers live solely in mockup-theme.css and
// don't reach this queue, which renders outside `.mockup-theme`). So chips
// here spell their colours out with Tailwind rather than naming a class that
// renders nothing. See ./pills.tsx.
const CHIP = "b whitespace-nowrap text-2xs! leading-none";

const CHIP_TONES = {
  green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  red: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
} as const;

const MENU_LABELS: Record<string, string> = {
  healthy_living: "Healthy Living",
  conditions: "Diseases & Conditions",
  symptoms: "Symptoms",
};

const SURFACE_LABELS: Record<string, string> = {
  library_featured: "Library featured",
  today_for_you: "Today · For You",
};

function chip(
  tone: keyof typeof CHIP_TONES,
  label: string,
  title?: string,
  Icon?: LucideIcon,
) {
  return (
    <span className={cn(CHIP, CHIP_TONES[tone])} title={title}>
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {label}
    </span>
  );
}

/** Where an article is in its life, as one badge. */
function statusChip(row: Row) {
  if (row.jobStatus === "failed")
    return chip("red", "Generation failed", row.errorCode ?? undefined, XCircle);
  if (row.jobStatus === "running")
    return chip("blue", "Running", undefined, Clock);
  if (!row.clinicalReviewedAt)
    return chip("amber", "Needs clinical review", undefined, Stethoscope);
  if (!row.scheduledAt)
    return chip("amber", "Reviewed · not scheduled", undefined, ClipboardList);

  const startsAt = new Date(row.scheduledAt).getTime();
  const now = Date.now();
  if (row.libraryStatus === "paused")
    return chip("slate", "Paused", undefined, Pause);
  if (startsAt > now) return chip("blue", "Scheduled", undefined, Calendar);
  if (row.featuredUntil && new Date(row.featuredUntil).getTime() <= now)
    // The whole point of the un-feature model: this is not "expired".
    return chip("slate", "Live · not promoted", undefined, BookOpen);
  return chip("green", "Live · promoted", undefined, CheckCircle2);
}

export default function AiSuggestions({
  suggestions,
  sourceLinkCount = 0,
  saving,
  mutate,
  onGenerate,
}: {
  suggestions: Row[];
  sourceLinkCount?: number;
  saving: boolean;
  mutate: (body: Record<string, unknown>, success: string) => Promise<boolean>;
  onGenerate: () => void;
}) {
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [permanent, setPermanent] = useState(false);

  const counts = useMemo(() => {
    let running = 0;
    let awaiting = 0;
    for (const row of suggestions) {
      if (row.jobStatus === "running") running += 1;
      else if (row.jobStatus !== "failed" && !row.scheduledAt) awaiting += 1;
    }
    return { running, awaiting };
  }, [suggestions]);

  return (
    <section className="card overflow-hidden" aria-labelledby="ai-suggestions-heading">
      <div className="card-header flex-wrap gap-3">
        <div>
          <h3 id="ai-suggestions-heading" className="card-title">
            <Bot className="mr-1.5 inline h-4 w-4 align-[-2px]" />
            AI content suggestions
          </h3>
          <p className="mt-1 text-2xs text-slate-500">
            AI proposes articles for the mobile Library, grounded{" "}
            <strong>only</strong> in the approved encyclopedia menus. Each
            article is scheduled on its own. When its promotion window ends the
            article is <strong>demoted, not deleted</strong> — it stays
            published and readable.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {counts.running > 0 &&
            chip("blue", `${counts.running} running`, undefined, Clock)}
          {chip("amber", `${counts.awaiting} awaiting schedule`, undefined, Stethoscope)}
          {chip("slate", `${sourceLinkCount} source links`, undefined, Link2)}
          <button type="button" className="btn btn-primary btn-sm" onClick={onGenerate}>
            <Sparkles className="h-4 w-4" /> Generate suggestions
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b bg-slate-50 dark:bg-slate-900">
              <th scope="col" className="p-3">Suggested Title</th>
              <th scope="col" className="p-3">Topic</th>
              <th scope="col" className="p-3">Format</th>
              <th scope="col" className="p-3">Linked Sources</th>
              <th scope="col" className="p-3">Grounding</th>
              <th scope="col" className="p-3">Suggested</th>
              <th scope="col" className="p-3">Goes Live</th>
              <th scope="col" className="p-3">Promoted Until</th>
              <th scope="col" className="p-3">Surfaces</th>
              <th scope="col" className="p-3">Freq. Cap</th>
              <th scope="col" className="p-3">Status</th>
              <th scope="col" className="p-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {suggestions.slice(0, 50).map((row) => {
              const grounded = Number(row.sourceCount ?? 0) > 0;
              const menus: string[] = row.sourceMenus ?? [];
              const surfaces: string[] = row.surfaces ?? [];
              return (
                <React.Fragment key={row.id}>
                  <tr className={cn("border-b", row.jobStatus === "failed" && "opacity-70")}>
                    <td className="p-3 font-semibold">{row.title}</td>
                    <td className="p-3">{darkPill(row.topic, "General")}</td>
                    <td className="p-3">{neutralPill(row.format, "—")}</td>
                    <td className="p-3">
                      {menus.length ? (
                        <span className="flex flex-wrap gap-1">
                          {menus.map((menu) => (
                            <React.Fragment key={menu}>
                              {neutralPill(MENU_LABELS[menu] ?? menu)}
                            </React.Fragment>
                          ))}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {grounded
                        ? chip("green", `Grounded · ${row.sourceCount}`, undefined, CheckCircle2)
                        : chip("amber", "Not verified", undefined, AlertTriangle)}
                    </td>
                    <td className="p-3 td-s">{dateTime(row.suggestedAt)}</td>
                    <td className="p-3">
                      {row.scheduledAt ? (
                        <span className="font-semibold text-blue-600">
                          {dateTime(row.scheduledAt)}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {row.scheduledAt ? (
                        row.featuredUntil ? (
                          <span className="td-s">{dateTime(row.featuredUntil)}</span>
                        ) : (
                          chip("green", "Permanent", undefined, Infinity)
                        )
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {surfaces.length ? (
                        <span className="flex flex-wrap gap-1">
                          {surfaces.map((surface) => (
                            <React.Fragment key={surface}>
                              {neutralPill(SURFACE_LABELS[surface] ?? surface)}
                            </React.Fragment>
                          ))}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {row.frequencyCapDays ? `1 per ${row.frequencyCapDays}d` : "—"}
                    </td>
                    <td className="p-3">{statusChip(row)}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {row.jobStatus === "failed" ? (
                        <span className="text-2xs text-slate-500">{row.errorCode ?? "—"}</span>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setPermanent(Boolean(row.scheduledAt) && !row.featuredUntil);
                              setSchedulingId(schedulingId === row.id ? null : row.id);
                            }}
                          >
                            {schedulingId === row.id ? (
                              "Close"
                            ) : row.scheduledAt ? (
                              <>
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </>
                            ) : (
                              <>
                                <Calendar className="h-3.5 w-3.5" /> Schedule
                              </>
                            )}
                          </button>
                          {/* Pause and resume are one toggle, so a paused
                              article always shows the way back. Resume keeps
                              the original dates -- Edit is how you extend a
                              window that elapsed while it was paused. */}
                          {row.scheduledAt && row.libraryStatus === "paused" && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm ml-1"
                              title="Resume with the original dates"
                              disabled={saving}
                              onClick={() =>
                                mutate(
                                  { action: "resume_content", contentId: row.id },
                                  row.featuredUntil &&
                                    new Date(row.featuredUntil).getTime() <= Date.now()
                                    ? "Resumed. Its promotion window already ended, so it is live and readable but not promoted — use Edit to promote it again."
                                    : "Resumed with its original schedule.",
                                )
                              }
                            >
                              <Play className="h-3.5 w-3.5" /> Resume
                            </button>
                          )}
                          {row.scheduledAt && row.libraryStatus !== "paused" && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm ml-1"
                              title="Pause — hides it from the app, keeps the schedule"
                              disabled={saving}
                              onClick={() =>
                                mutate(
                                  { action: "unschedule_content", contentId: row.id },
                                  "Article paused. Its schedule is kept — press Resume to bring it back.",
                                )
                              }
                            >
                              <Pause className="h-3.5 w-3.5" /> Pause
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>

                  {schedulingId === row.id && (
                    <tr className="border-b bg-slate-50 dark:bg-slate-900">
                      <td colSpan={12} className="p-3">
                        {!row.clinicalReviewedAt && (
                          <div
                            className="mb-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-500/15 p-2 text-2xs text-amber-900 dark:text-amber-300"
                            role="note"
                          >
                            This article has no clinical review on record. The
                            server will reject the schedule until it does —
                            scheduling must not be a way to publish around
                            review.
                          </div>
                        )}
                        <form
                          className="grid grid-cols-1 gap-3 md:grid-cols-5"
                          aria-label={`Schedule ${row.title}`}
                          onSubmit={(event) => {
                            event.preventDefault();
                            const form = new FormData(event.currentTarget);
                            const raw = String(form.get("startsAt") ?? "");
                            if (!raw) return;
                            const surfaceValues = form.getAll("surfaces").map(String);
                            const cap = Number(form.get("frequencyCapDays"));
                            mutate(
                              {
                                action: "schedule_content",
                                contentId: row.id,
                                startsAt: new Date(raw).toISOString(),
                                featuredWeeks: permanent
                                  ? "permanent"
                                  : Number(form.get("featuredWeeks")),
                                surfaces: surfaceValues,
                                frequencyCapDays: cap > 0 ? cap : null,
                              },
                              permanent
                                ? "Scheduled. From that moment it is live and promoted indefinitely."
                                : "Scheduled. When the window ends it stays published — it just stops being promoted.",
                            );
                            setSchedulingId(null);
                          }}
                        >
                          <label className="form-label">
                            Goes live
                            <input
                              name="startsAt"
                              type="datetime-local"
                              required
                              defaultValue={
                                row.scheduledAt
                                  ? new Date(row.scheduledAt).toISOString().slice(0, 16)
                                  : undefined
                              }
                              className={FIELD}
                            />
                          </label>

                          <label className="form-label">
                            Promote for
                            <select
                              name="featuredWeeks"
                              defaultValue="2"
                              disabled={permanent}
                              className={cn(FIELD, permanent && "opacity-50")}
                            >
                              <option value="1">1 week</option>
                              <option value="2">2 weeks</option>
                              <option value="4">4 weeks</option>
                              <option value="12">12 weeks</option>
                            </select>
                            <span className="mt-1 flex items-center gap-1 text-2xs text-slate-500">
                              <input
                                type="checkbox"
                                checked={permanent}
                                onChange={(event) => setPermanent(event.target.checked)}
                              />
                              Permanent — never stop promoting
                            </span>
                          </label>

                          <fieldset className="form-label">
                            <legend>Promote on</legend>
                            {Object.entries(SURFACE_LABELS).map(([value, label]) => (
                              <label
                                key={value}
                                className="mt-1 flex items-center gap-2 text-xs font-normal"
                              >
                                <input
                                  type="checkbox"
                                  name="surfaces"
                                  value={value}
                                  defaultChecked={
                                    surfaces.length
                                      ? surfaces.includes(value)
                                      : value === "library_featured"
                                  }
                                />
                                {label}
                              </label>
                            ))}
                          </fieldset>

                          <label className="form-label">
                            Frequency cap
                            <select
                              name="frequencyCapDays"
                              defaultValue={String(row.frequencyCapDays ?? 14)}
                              className={FIELD}
                            >
                              <option value="0">No cap</option>
                              <option value="7">1 per 7 days</option>
                              <option value="14">1 per 14 days</option>
                              <option value="30">1 per 30 days</option>
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
              );
            })}
            {!suggestions.length && (
              <tr>
                <td colSpan={12} className="p-4 text-slate-500">
                  No AI content suggestions yet. Use{" "}
                  <strong>Generate suggestions</strong> above to create some.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {suggestions.length > 50 && (
        <div className="border-t p-3 text-2xs text-slate-500">
          Showing the 50 most recent of {suggestions.length}. An ungrounded
          draft fails its whole generation run rather than reaching this queue.
        </div>
      )}
    </section>
  );
}
