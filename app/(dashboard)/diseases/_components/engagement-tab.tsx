"use client";

/**
 * Engagement Analytics tab (Gap Analysis Part I, I2/I5/I-D5).
 * Backed by GET /api/diseases/stats. Everything renders from columns that
 * actually exist today; Likes/Saves read 0 until the content_engagement
 * pipeline lands (audit doc Part 4) — the tab says so explicitly instead
 * of showing fake data.
 */

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useDiseasesStatsApi } from "@/hooks/supabase-calls/useDiseasesApi";

const Leaderboard = ({
  title,
  icon,
  rows,
  unit,
}: {
  title: string;
  icon: string;
  rows: { id: string; name: string; value: number }[];
  unit: string;
}) => (
  <div className="card p-0 overflow-hidden border-slate-200">
    <div className="px-5 py-4 border-b border-slate-100">
      <h4 className="text-xs font-black uppercase tracking-widest text-slate-700">
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
          <li key={row.id} className="flex items-center gap-3 px-5 py-2.5">
            <span className="text-[10px] font-black text-slate-400 w-5 text-right shrink-0">
              {i + 1}.
            </span>
            <span className="text-xs font-bold text-slate-800 truncate flex-1">
              {row.name}
            </span>
            <span className="text-[11px] font-black text-slate-600 shrink-0">
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

  if (isLoading || !data) {
    return (
      <div className="card py-24 text-center text-xs font-bold text-slate-400">
        Loading engagement analytics…
      </div>
    );
  }

  const { totals, topViewed, topLiked, topSaved, categoryBreakdown, engagementPipelineLive } =
    data;
  const maxCategory = Math.max(1, ...categoryBreakdown.map((c) => c.count));

  return (
    <div className="space-y-6">
      {!engagementPipelineLive && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-bold text-amber-800">
          ℹ️ Likes/Saves counters are wired but read 0 — they populate once the
          mobile content_engagement pipeline ships (Mapping Audit Part 4 / Epic
          30.1). Views and review metrics below are live.
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
          value={totals.views.toLocaleString()}
          variant="red"
          delta="Lifetime views"
          deltaType="neutral"
        />
        <KpiCard
          icon="❤️"
          label="Total Likes"
          value={totals.likes.toLocaleString()}
          variant="purple"
          delta={engagementPipelineLive ? "Live" : "Awaiting pipeline"}
          deltaType="neutral"
        />
        <KpiCard
          icon="🔖"
          label="Total Saves"
          value={totals.saves.toLocaleString()}
          variant="teal"
          delta={engagementPipelineLive ? "Live" : "Awaiting pipeline"}
          deltaType="neutral"
        />
        <KpiCard
          icon="✅"
          label="Review Rate"
          value={`${totals.reviewRate}%`}
          variant="green"
          delta="Reviewed by an editor"
          deltaType="neutral"
        />
        <KpiCard
          icon="📈"
          label="Save Rate"
          value={`${totals.saveRate}%`}
          variant="amber"
          delta={`${totals.likeRate}% like rate (views-relative)`}
          deltaType="neutral"
        />
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Leaderboard title="Top Viewed" icon="👁️" rows={topViewed} unit="views" />
        <Leaderboard title="Top Liked" icon="❤️" rows={topLiked} unit="likes" />
        <Leaderboard title="Top Saved" icon="🔖" rows={topSaved} unit="saves" />
      </div>

      {/* Category breakdown */}
      <div className="card p-5 border-slate-200">
        <h4 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-4">
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
                <span className="text-[11px] font-bold text-slate-600 w-40 truncate shrink-0">
                  {c.name}
                </span>
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${(c.count / maxCategory) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] font-black text-slate-700 w-8 text-right shrink-0">
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
