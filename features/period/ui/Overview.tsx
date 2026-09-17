"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import DataTable, { type Column } from "@/components/redesign/DataTable";
import FeatureCatalogueCard from "@/components/redesign/FeatureCatalogueCard";
import KpiCard from "@/components/redesign/KpiCard";
import { cn } from "@/lib/utils";
import type { Row } from "@/features/period/schema/types";
import { pct } from "./formatters";
import { columns } from "./columns";

const PHASE_COLORS: Record<string, string> = {
  Menstrual: "#EC4899",
  Follicular: "#3B82F6",
  Ovulatory: "#F59E0B",
  Luteal: "#8B5CF6",
};
const PHASE_FALLBACK_COLOR = "#64748B";

const GOAL_BARS: Record<string, { bar: string; text: string }> = {
  "Track Period": { bar: "bg-pink-500", text: "text-pink-700 dark:text-pink-400" },
  "Trying to Conceive": { bar: "bg-purple-500", text: "text-purple-700 dark:text-purple-400" },
  Pregnancy: { bar: "bg-teal-500", text: "text-teal-700 dark:text-teal-400" },
  "Manage PCOS": { bar: "bg-blue-500", text: "text-blue-700 dark:text-blue-400" },
};
const GOAL_FALLBACK = { bar: "bg-slate-400", text: "text-slate-500" };

export default function Overview({ payload }: { payload: any }) {
  const summary = payload.summary ?? {};
  // Real 8-week trend — bucketed server-side (features/period/api/data-get.ts)
  // from period_daily_logs rows already fetched for logs30d, now ordered by
  // created_at desc so the 5,000-row cap can't silently drop recent rows.
  const logsTrend: { label: string; value: number }[] = summary.logsTrend ?? [];
  const hasLogsTrend = logsTrend.length >= 2;
  const lastWeekLogs = logsTrend[logsTrend.length - 1]?.value ?? 0;
  const prevWeekLogs = logsTrend[logsTrend.length - 2]?.value ?? 0;
  const logsWowPct = prevWeekLogs > 0 ? Math.round(((lastWeekLogs - prevWeekLogs) / prevWeekLogs) * 100) : null;
  // "flat" (zero change, a real comparison) is a distinct amber signal from
  // "neutral" (no prior week to compare against at all).
  const logsDirection: "up" | "down" | "flat" | "neutral" =
    logsWowPct == null ? "neutral" : logsWowPct === 0 ? "flat" : logsWowPct > 0 ? "up" : "down";
  const logsDeltaText =
    logsWowPct != null
      ? logsWowPct === 0
        ? "No change vs last week"
        : `${Math.abs(logsWowPct)}% vs last week`
      : "8-week trend";
  const phaseDistribution: Row[] = payload.phaseDistribution ?? [];
  const phaseTotal = phaseDistribution.reduce((sum, item) => sum + Number(item.count ?? 0), 0);
  const trackingGoals: Row[] = payload.trackingGoals ?? [];
  const goalTotal = Math.max(1, trackingGoals.reduce((sum, item) => sum + Number(item.count ?? 0), 0));
  const regionColumns: Column<Row>[] = [
    { key: "region", label: "Region" },
    { key: "activeTrackers", label: "Active (30d)" },
    { key: "totalTrackers", label: "Total" },
    { key: "new30d", label: "New (30d)" },
    {
      key: "averageCycle",
      label: "Avg Cycle",
      render: (value) => (value == null ? "—" : `${value} days`),
    },
    { key: "retention", label: "Retention", render: pct },
    { key: "irregularRate", label: "Variation Signal", render: pct },
    { key: "marketingOptIn", label: "Marketing Opt-in", render: pct },
  ];
  return (
    <div className="space-y-4">
      {/*
        Daily Logs is the one bento hero here: logsTrend is a genuine 8-week
        series bucketed server-side from period_daily_logs rows the overview
        request already fetches (see the comment on `logsTrend` above), so a
        week-over-week trend is real, not fabricated.

        Active Trackers and Total Trackers merge into one fraction card
        ("33 active / 500 total" style, see BedTrackerPage's "Facilities
        Online") since active is simply a subset of total — no separate
        chart needed to say that.

        Forecast Accuracy stays a plain number on purpose: period_forecasts
        does carry confirmed_period_start per row (Phase 2 accuracy
        instrumentation), but this endpoint only selects absolute_error_days
        for the average, and the sample only grows as forecasts confirm over
        a full cycle — charting it would need a new query against a still-thin,
        nullable sample. Average Cycle and 30-day Retention are single
        current-snapshot numbers with nothing dated already fetched that's
        worth bucketing, so they stay compact rather than inflated.
      */}
      <KpiCard
        icon="📝"
        label="Daily Logs (30d)"
        value={String(summary.logs30d ?? 0)}
        variant="green"
        delta={hasLogsTrend ? logsDeltaText : undefined}
        deltaType={logsDirection}
        trend={hasLogsTrend ? logsTrend : undefined}
        size={hasLogsTrend ? "lg" : "default"}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          icon="👥"
          label="Active / Total Trackers"
          value={`${summary.activeTrackers ?? 0} / ${summary.totalTrackers ?? 0}`}
          variant="blue"
          delta="Active in the last 30 days"
          deltaType="neutral"
        />
        <KpiCard
          icon="📅"
          label="Cycle Records"
          value={String(summary.cycleLogs ?? 0)}
          variant="purple"
          size="sm"
        />
        <KpiCard
          icon="🔄"
          label="Average Cycle"
          value={
            summary.averageCycleLength == null
              ? "Not measured"
              : `${summary.averageCycleLength} days`
          }
          variant="purple"
          size="sm"
        />
        <KpiCard
          icon="↩️"
          label="30-day Retention"
          value={pct(summary.retention)}
          variant="blue"
          size="sm"
        />
        <KpiCard
          icon="🎯"
          label="Forecast Accuracy"
          value={
            summary.forecastError == null
              ? "Not enough data yet"
              : `±${summary.forecastError} days`
          }
          delta={
            summary.forecastErrorSamples
              ? `${summary.forecastErrorSamples} confirmed forecast${summary.forecastErrorSamples === 1 ? "" : "s"}`
              : undefined
          }
          deltaType="neutral"
          variant="teal"
          size="sm"
        />
      </div>
      <FeatureCatalogueCard
        areaIds={["period"]}
        title="Period Tracker features"
        description="What Plasence currently promises users, how an admin can recognise that each service is working, and which additions are only future ideas."
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="card-header">
            <div>
              <div className="card-title">Regional operations</div>
              <div className="mt-1 text-2xs text-slate-500">
                Unique users; cycle variation is a review signal, not a
                diagnosis.
              </div>
            </div>
          </div>
          <DataTable
            caption="Period Tracker regional operations"
            columns={regionColumns}
            data={payload.regions ?? []}
            pagination={false}
            getRowId={(row) => row.region}
          />
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Daily symptom trends</div>
          </div>
          <div className="space-y-2 p-4">
            {(payload.symptoms ?? []).map((item: Row) => (
              <div
                key={item.name}
                className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 text-xs"
              >
                <span>{item.name}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
            {!(payload.symptoms ?? []).length && (
              <p className="text-xs text-slate-500">
                No normalized daily symptom data is available.
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Current phase distribution</div>
              <div className="mt-1 text-2xs text-slate-500">
                Latest cycle per tracker, today.
              </div>
            </div>
          </div>
          {!phaseTotal ? (
            <p className="p-4 text-xs text-slate-500">
              No cycle phase data is available yet.
            </p>
          ) : (
            <>
              <div className="h-48 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={phaseDistribution}
                      dataKey="count"
                      nameKey="phase"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={5}
                    >
                      {phaseDistribution.map((item) => (
                        <Cell
                          key={item.phase}
                          fill={PHASE_COLORS[item.phase] ?? PHASE_FALLBACK_COLOR}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 p-4 pt-0">
                {phaseDistribution.map((item) => (
                  <div
                    key={item.phase}
                    className="flex items-center gap-2 text-2xs font-bold text-slate-500"
                  >
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: PHASE_COLORS[item.phase] ?? PHASE_FALLBACK_COLOR }}
                    />
                    <span>
                      {item.phase} ({Math.round((Number(item.count) / phaseTotal) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Tracking goal mix</div>
              <div className="mt-1 text-2xs text-slate-500">
                Chosen at onboarding, from period_user_settings.
              </div>
            </div>
          </div>
          <div className="space-y-3 p-4">
            {trackingGoals.map((item: Row) => {
              const style = GOAL_BARS[item.goal] ?? GOAL_FALLBACK;
              const share = Math.round((Number(item.count ?? 0) / goalTotal) * 100);
              return (
                <div key={item.goal} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-xs text-slate-700 dark:text-slate-300">
                    {item.goal}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={cn("h-2 rounded-full", style.bar)}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                  <span className={cn("w-10 text-right text-2xs font-semibold", style.text)}>
                    {share}%
                  </span>
                </div>
              );
            })}
            {!trackingGoals.length && (
              <p className="text-xs text-slate-500">
                No onboarding goal data is available.
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="card p-4">
        <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
          Metric definitions
        </h2>
        <dl className="mt-3 grid gap-3 md:grid-cols-2">
          {Object.entries(payload.definitions ?? {}).map(([key, value]) => (
            <div key={key}>
              <dt className="text-2xs font-semibold capitalize text-slate-700 dark:text-slate-300">
                {key.replace(/([A-Z])/g, " $1")}
              </dt>
              <dd className="text-2xs text-slate-500">{String(value)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
