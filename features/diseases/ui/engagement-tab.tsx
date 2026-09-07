"use client";

/**
 * Engagement Analytics tab (Gap Analysis Part I, I2/I5 + Mapping Audit Part 4).
 * Backed by GET /api/diseases/stats (conditions registry: views, review rate,
 * categories, top viewed) and GET /api/diseases/engagement (content_engagement
 * pipeline: live likes/saves, unique engagers, 30-day trend, cross-content
 * leaderboards). Until the content_engagement migration is applied the
 * pipeline section degrades to the amber banner instead of fake data.
 */

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import {
  useDiseasesStatsApi,
  useDiseasesEngagementApi,
} from "@/features/diseases/data/useDiseasesApi";

const CONTENT_TYPE_LABELS: Record<string, string> = {
  condition: "Condition",
  symptom: "Symptom",
  healthy_living: "Healthy Living",
  fitness_exercise: "Exercise",
};

const Leaderboard = ({
  title,
  icon,
  rows,
  unit,
}: {
  title: string;
  icon: string;
  rows: { id: string; name: string; value: number; contentType?: string }[];
  unit: string;
}) => (
  <div className="card p-0 overflow-hidden border-slate-200">
    <div className="px-5 py-4 border-b border-slate-100">
      <h4 className="section-heading">
        {icon} {title}
      </h4>
    </div>
    {rows.length === 0 ? (
      <div className="p-6 text-center text-xs font-bold text-slate-400">
        No data yet.
      </div>
    ) : (
      <ul className="divide-y divide-slate-100">
        {rows.slice(0, 10).map((row, i) => (
          <li key={`${row.id}-${i}`} className="flex items-center gap-3 px-5 py-2.5">
            <span className="text-2xs font-black text-slate-400 w-5 text-right shrink-0">
              {i + 1}.
            </span>
            <span className="text-xs font-bold text-slate-800 truncate flex-1">
              {row.name}
              {row.contentType && (
                <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-3xs font-black uppercase tracking-wide text-slate-500">
                  {CONTENT_TYPE_LABELS[row.contentType] ?? row.contentType}
                </span>
              )}
            </span>
            <span className="text-xs font-black text-slate-600 shrink-0">
              {row.value.toLocaleString()} {unit}
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const EngagementTab = () => {
  const { data, isLoading } = useDiseasesStatsApi(true);
  const engagementQuery = useDiseasesEngagementApi(true);

  if (isLoading || !data) {
    return (
      <div className="card py-24 text-center text-xs font-bold text-slate-400">
        Loading engagement analytics…
      </div>
    );
  }

  const { totals, topViewed, categoryBreakdown, engagementPipelineLive } = data;
  const engagement = engagementQuery.data;
  // Pipeline counts win once the content_engagement route answers; the
  // counter shells on conditions stay the fallback.
  const pipelineLive = engagementPipelineLive && !!engagement;
  const likes = pipelineLive ? engagement.totals.likes : totals.likes;
  const saves = pipelineLive ? engagement.totals.saves : totals.saves;
  const views = pipelineLive ? engagement.totals.views : totals.views;
  const saveRate = pipelineLive ? engagement.totals.saveRate : totals.saveRate;
  const likeRate = pipelineLive ? engagement.totals.likeRate : totals.likeRate;
  const maxCategory = Math.max(1, ...categoryBreakdown.map((c) => c.count));
  const trend = pipelineLive ? engagement.trend : [];
  const maxTrend = Math.max(1, ...trend.map((t) => t.likes + t.saves));

  return (
    <div className="space-y-6">
      {!pipelineLive && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
          ℹ️ Likes/Saves counters are wired but read 0 — they populate once the
          content_engagement migration (Mapping Audit Part 4 / Epic 30.1) is
          applied. Views and review metrics below are live.
        </div>
      )}

      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          icon="🦠"
          label="Conditions"
          value={totals.conditions.toLocaleString()}
          variant="blue"
          delta="Registry size"
          deltaType="neutral"
        />
        <KpiCard
          icon="👁️"
          label="Total Views"
          value={views.toLocaleString()}
          variant="red"
          delta={pipelineLive ? "All health content" : "Conditions only"}
          deltaType="neutral"
        />
        <KpiCard
          icon="❤️"
          label="Total Likes"
          value={likes.toLocaleString()}
          variant="purple"
          delta={pipelineLive ? "Live" : "Awaiting pipeline"}
          deltaType="neutral"
        />
        <KpiCard
          icon="🔖"
          label="Total Saves"
          value={saves.toLocaleString()}
          variant="teal"
          delta={pipelineLive ? "Live" : "Awaiting pipeline"}
          deltaType="neutral"
        />
        <KpiCard
          icon="👥"
          label="Unique Engagers"
          value={(engagement?.totals.uniqueEngagers ?? 0).toLocaleString()}
          variant="green"
          delta={pipelineLive ? "Users who liked/saved" : "Awaiting pipeline"}
          deltaType="neutral"
        />
        <KpiCard
          icon="📈"
          label="Save Rate"
          value={`${saveRate}%`}
          variant="amber"
          delta={`${likeRate}% like rate (views-relative)`}
          deltaType="neutral"
        />
      </div>

      {/* 30-day trend */}
      <div className="card p-5 border-slate-200">
        <h4 className="section-heading mb-4">
          📊 Likes & Saves — Last 30 Days
        </h4>
        {trend.length === 0 ? (
          <p className="text-xs font-bold text-slate-400">
            No engagement recorded yet.
          </p>
        ) : (
          <>
            <div className="flex items-end gap-1 h-24">
              {trend.map((day) => (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col justify-end gap-px"
                  title={`${day.date}: ${day.likes} likes, ${day.saves} saves`}
                >
                  <div
                    className="bg-purple-400 rounded-t-sm"
                    style={{ height: `${(day.likes / maxTrend) * 100}%` }}
                  />
                  <div
                    className="bg-teal-400 rounded-b-sm"
                    style={{ height: `${(day.saves / maxTrend) * 100}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-4 text-2xs font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-purple-400" /> Likes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-teal-400" /> Saves
              </span>
              <span className="ml-auto">
                {trend[0]?.date} → {trend[trend.length - 1]?.date}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Leaderboard title="Top Viewed" icon="👁️" rows={topViewed} unit="views" />
        <Leaderboard
          title="Top Liked"
          icon="❤️"
          rows={pipelineLive ? engagement.topLiked : []}
          unit="likes"
        />
        <Leaderboard
          title="Top Saved"
          icon="🔖"
          rows={pipelineLive ? engagement.topSaved : []}
          unit="saves"
        />
      </div>

      {/* Per-content-type engagement */}
      {pipelineLive && engagement.byType.length > 0 && (
        <div className="card p-5 border-slate-200">
          <h4 className="section-heading mb-4">
            💗 Engagement by Content Type
          </h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {engagement.byType.map((entry) => (
              <div key={entry.type} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-2xs font-black uppercase tracking-widest text-slate-500">
                  {CONTENT_TYPE_LABELS[entry.type] ?? entry.type}
                </p>
                <p className="mt-1 text-sm font-black text-slate-800">
                  ❤️ {entry.likes.toLocaleString()}
                  <span className="mx-1.5 text-slate-300">·</span>
                  🔖 {entry.saves.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category breakdown */}
      <div className="card p-5 border-slate-200">
        <h4 className="section-heading mb-4">
          📂 Conditions by Category
        </h4>
        {categoryBreakdown.length === 0 ? (
          <p className="text-xs font-bold text-slate-400">
            No category linkages yet.
          </p>
        ) : (
          <div className="space-y-2.5">
            {categoryBreakdown.slice(0, 12).map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600 w-40 truncate shrink-0">
                  {c.name}
                </span>
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${(c.count / maxCategory) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-black text-slate-700 w-8 text-right shrink-0">
                  {c.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EngagementTab;
