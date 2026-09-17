"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useAdminTaskStats, useAdminTasks } from "@/features/tasks/data/useAdminTasks";

export default function TaskStats() {
  const { data, isLoading, isError } = useAdminTaskStats();
  // Same query key ("admin-tasks") that features/tasks/ui/KanbanBoard.tsx
  // already fetches on this same page (TasksPage.tsx renders both) — React
  // Query dedupes the in-flight request, so this is not a new round trip.
  // admin_tasks is the whole staff task board, unpaginated (features/tasks/
  // api/list.ts), which is safe to bucket client-side because it's an
  // internal team queue, not user-facing scale.
  const { data: taskList } = useAdminTasks();

  // Real weekly "tasks completed" trend, derived from completed_at on the
  // tasks currently marked completed — the same rows the "Completed" count
  // below sums, just broken out by week instead of collapsed to one total.
  // completed_at is cleared if a task is dragged back out of the Completed
  // column (update_admin_task_status in supabase/migrations/
  // 20260813_epic22_admin_task_manager.sql), so this always reflects what's
  // completed right now — never a stale/reverted count. Guarded against
  // legacy rows where completed_at is null despite status = 'completed'.
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const weekBucket = (iso: string) => Math.floor(new Date(iso).getTime() / WEEK_MS);
  const completedByWeek = new Map<number, number>();
  let hasCompletedHistory = false;
  for (const task of taskList?.tasks ?? []) {
    if (task.status !== "completed" || !task.completedAt) continue;
    hasCompletedHistory = true;
    const bucket = weekBucket(task.completedAt);
    completedByWeek.set(bucket, (completedByWeek.get(bucket) ?? 0) + 1);
  }
  const currentWeekBucket = weekBucket(new Date().toISOString());
  const weekLabel = (bucket: number) =>
    `Week of ${new Date(bucket * WEEK_MS).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  const completedTrendPoints = Array.from({ length: 8 }, (_, i) => {
    const bucket = currentWeekBucket - (7 - i);
    return { label: weekLabel(bucket), value: completedByWeek.get(bucket) ?? 0 };
  });
  const lastWeekCompleted = completedTrendPoints[completedTrendPoints.length - 1]?.value ?? 0;
  const prevWeekCompleted = completedTrendPoints[completedTrendPoints.length - 2]?.value ?? 0;
  const completedWowPct =
    prevWeekCompleted > 0 ? Math.round(((lastWeekCompleted - prevWeekCompleted) / prevWeekCompleted) * 100) : null;
  // "flat" (zero change, a real comparison) is a distinct amber signal
  // from "neutral" (no prior week to compare against at all).
  const completedDirection: "up" | "down" | "flat" | "neutral" =
    completedWowPct == null ? "neutral" : completedWowPct === 0 ? "flat" : completedWowPct > 0 ? "up" : "down";
  const completedDeltaText =
    completedWowPct != null
      ? `${Math.abs(completedWowPct)}% vs last week`
      : lastWeekCompleted > 0
        ? "New completions vs 0 last week"
        : "No change vs last week";

  return (
    <div className="space-y-4 mb-6">
      {/*
        Completed is the one card with real history to chart (see above),
        so it's the hero. New/In Progress/Under Review are current queue
        depths with no history table behind status changes — plain
        snapshot counts, sized down instead of inflated to match.
      */}
      <KpiCard
        icon="✅" label="Completed" variant="green"
        value={data?.completed ?? 0} isLoading={isLoading} isError={isError}
        delta={hasCompletedHistory ? completedDeltaText : "All time"}
        deltaType={hasCompletedHistory ? completedDirection : "neutral"}
        trend={hasCompletedHistory ? completedTrendPoints : undefined}
        size={hasCompletedHistory ? "lg" : "default"}
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <KpiCard
          icon="📥" label="New Tasks" variant="blue" size="sm"
          value={data?.new ?? 0} isLoading={isLoading} isError={isError}
          delta="Awaiting action" deltaType="neutral"
        />
        <KpiCard
          icon="⚙️" label="In Progress" variant="gold" size="sm"
          value={data?.in_progress ?? 0} isLoading={isLoading} isError={isError}
          delta="Active work" deltaType="neutral"
        />
        <KpiCard
          icon="🔍" label="Under Review" variant="purple" size="sm"
          value={data?.under_review ?? 0} isLoading={isLoading} isError={isError}
          delta="SA sign-off" deltaType="neutral"
        />
      </div>
    </div>
  );
}
