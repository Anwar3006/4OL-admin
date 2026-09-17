"use client";

import React from "react";
import Link from "next/link";
import { BellRing, CalendarCheck2, CircleAlert, Clock3 } from "lucide-react";
import KpiCard from "@/components/redesign/KpiCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard icon={<CalendarCheck2 className="size-4" />} label="Completed this week" value={isLoading ? "..." : data?.this_week.completed ?? 0} variant="green" />
        <KpiCard icon={<Clock3 className="size-4" />} label="In progress" value={isLoading ? "..." : data?.this_week.in_progress ?? 0} variant="blue" />
        <KpiCard icon={<CircleAlert className="size-4" />} label="Abandoned" value={isLoading ? "..." : data?.this_week.abandoned ?? 0} variant="red" />
      </div>

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
