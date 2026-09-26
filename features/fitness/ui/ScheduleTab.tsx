"use client";

import React from "react";
import Link from "next/link";
import { BellRing, CalendarCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Sparkline from "@/components/redesign/Sparkline";
import { useFitnessScheduleStats } from "@/features/fitness/data/useFitnessAnalytics";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ScheduleTab() {
  const { data, isLoading, isError } = useFitnessScheduleStats();
  const heatmap = data?.heatmap ?? [];
  const weeks = Array.from(new Set(heatmap.map((cell) => cell.week))).sort();
  const maxSessions = Math.max(1, ...heatmap.map((cell) => cell.sessions));
  const countFor = (week: string, weekday: number) =>
    heatmap.find((cell) => cell.week === week && cell.weekday === weekday)?.sessions ?? 0;
  const shade = (count: number) => {
    if (!count) return "bg-slate-100 dark:bg-slate-800";
    const ratio = count / maxSessions;
    if (ratio <= 0.25) return "bg-emerald-200";
    if (ratio <= 0.5) return "bg-emerald-400";
    if (ratio <= 0.75) return "bg-emerald-600";
    return "bg-emerald-800";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="border-blue-200 bg-blue-50/60 dark:border-blue-500/30 dark:bg-blue-500/10">
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
              <CalendarCheck2 className="size-5 text-blue-600" />
              Member activity schedule
            </h2>
            <p className="mt-1 max-w-3xl text-sm font-medium text-slate-600 dark:text-slate-300">
              This page shows when members actually work out and whether sessions finish. The old “Content Schedule” button referred to publishing workouts and broadcasts, but it was not connected to an action, so it has been removed to avoid confusion.
            </p>
          </div>
          <Link href="/notifications">
            <Button variant="outline" className="shrink-0 bg-white dark:bg-slate-900">
              <BellRing className="size-4" /> Manage reminders
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/*
        Bento hero: this is the one card in Fitness with a real, evenly-
        spaced historical series to chart — `heatmap` already covers a
        fixed eight-week window (see useFitnessScheduleStats), so a
        week-over-week trend here is genuine, not fabricated. The
        completed/in-progress/abandoned split is a different signal (this
        week's composition, not history), so it stays as a segmented bar
        underneath rather than being folded into the sparkline.
      */}
      <Card>
        <CardContent className="flex flex-col gap-5 p-6 sm:p-8">
          {isLoading ? (
            <div className="h-32 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
          ) : isError ? (
            <div className="text-sm font-medium text-red-700 dark:text-red-400">Weekly session data could not be loaded.</div>
          ) : (
            (() => {
              const week = data?.this_week ?? { completed: 0, in_progress: 0, abandoned: 0 };
              const total = week.completed + week.in_progress + week.abandoned;
              const pct = (n: number) => (total ? (n / total) * 100 : 0);

              const weeklyTotals = weeks.map((w) =>
                WEEKDAY_LABELS.reduce((sum, _, idx) => sum + countFor(w, idx + 1), 0),
              );
              const weeklyTrendPoints = weeks.map((w, idx) => {
                const [year, weekNum] = w.split("-W");
                return { label: `Week ${weekNum}, ${year}`, value: weeklyTotals[idx] };
              });
              const hasTrend = weeklyTotals.length >= 2;
              const lastWeek = weeklyTotals[weeklyTotals.length - 1] ?? 0;
              const prevWeek = weeklyTotals[weeklyTotals.length - 2] ?? 0;
              const wowPct = prevWeek > 0 ? Math.round(((lastWeek - prevWeek) / prevWeek) * 100) : null;
              // "flat" (zero change, a real comparison) is a distinct
              // amber signal from "neutral" (no prior week to compare
              // against at all) — collapsing them would hide a stall.
              const wowDirection: "up" | "down" | "flat" | "neutral" =
                wowPct == null ? "neutral" : wowPct === 0 ? "flat" : wowPct > 0 ? "up" : "down";

              return (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1.5">
                      <div className="text-xs font-medium text-slate-500">This week&apos;s sessions</div>
                      <div className="text-3xl font-semibold leading-tight tracking-tight tabular-nums text-slate-900 dark:text-white">
                        {total.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 size-12 shrink-0" style={{ fontSize: "22px" }}>
                      <CalendarCheck2 className="size-5" />
                    </div>
                  </div>

                  {/* Delta (real week-over-week change) + 8-week trend sparkline */}
                  {hasTrend && (
                    <div className="flex items-center justify-between gap-3">
                      {wowPct != null ? (
                        <Badge
                          variant={
                            wowDirection === "up"
                              ? "emerald"
                              : wowDirection === "down"
                                ? "destructive"
                                : wowDirection === "flat"
                                  ? "amber"
                                  : "secondary"
                          }
                          className="shrink-0 font-medium"
                        >
                          {wowDirection === "up" && <span className="text-sm">↑</span>}
                          {wowDirection === "down" && <span className="text-sm">↓</span>}
                          {wowDirection === "flat" && <span className="text-sm">→</span>}
                          {wowDirection === "flat" ? "No change vs last week" : `${Math.abs(wowPct)}% vs last week`}
                        </Badge>
                      ) : (
                        <span className="shrink-0 text-2xs font-medium text-slate-400">8-week trend</span>
                      )}
                      <Sparkline data={weeklyTrendPoints} trend={wowDirection} height={36} />
                    </div>
                  )}

                  <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="bg-emerald-500" style={{ width: `${pct(week.completed)}%` }} title={`Completed: ${week.completed}`} />
                    <div className="bg-blue-500" style={{ width: `${pct(week.in_progress)}%` }} title={`In progress: ${week.in_progress}`} />
                    <div className="bg-red-500" style={{ width: `${pct(week.abandoned)}%` }} title={`Abandoned: ${week.abandoned}`} />
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                      <span className="size-2.5 shrink-0 rounded-full bg-emerald-500" />
                      Completed <span className="tabular-nums text-slate-500">{week.completed.toLocaleString()}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                      <span className="size-2.5 shrink-0 rounded-full bg-blue-500" />
                      In progress <span className="tabular-nums text-slate-500">{week.in_progress.toLocaleString()}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                      <span className="size-2.5 shrink-0 rounded-full bg-red-500" />
                      Abandoned <span className="tabular-nums text-slate-500">{week.abandoned.toLocaleString()}</span>
                    </span>
                  </div>
                </>
              );
            })()
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl font-black">Workout completion by day</CardTitle>
              <p className="mt-1 text-xs font-medium text-slate-500">Completed mobile workout sessions during the last eight weeks.</p>
            </div>
            <div className="flex items-center gap-1 text-3xs font-black uppercase tracking-widest text-slate-400">
              Low <span className="size-3 rounded bg-slate-100 dark:bg-slate-800" />
              <span className="size-3 rounded bg-emerald-200" />
              <span className="size-3 rounded bg-emerald-400" />
              <span className="size-3 rounded bg-emerald-600" />
              <span className="size-3 rounded bg-emerald-800" /> High
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isError ? (
            <div className="rounded-xl bg-red-50 p-5 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">Workout schedule data could not be loaded.</div>
          ) : isLoading ? (
            <div className="py-14 text-center text-sm text-slate-400">Loading activity schedule…</div>
          ) : weeks.length === 0 ? (
            <div className="py-14 text-center text-sm text-slate-400">No completed sessions have been recorded in the last eight weeks.</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="inline-grid gap-1" style={{ gridTemplateColumns: `2.75rem repeat(${weeks.length}, 1.75rem)` }}>
                <div />
                {weeks.map((week) => <div key={week} className="h-14 rotate-180 text-center text-3xs font-black uppercase text-slate-400 [writing-mode:vertical-rl]">{week}</div>)}
                {WEEKDAY_LABELS.map((day, index) => (
                  <React.Fragment key={day}>
                    <div className="flex items-center text-3xs font-black uppercase text-slate-400">{day}</div>
                    {weeks.map((week) => {
                      const count = countFor(week, index + 1);
                      return <div key={`${week}-${day}`} className={`size-7 rounded-md ${shade(count)}`} title={`${week} ${day}: ${count} completed sessions`} />;
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
