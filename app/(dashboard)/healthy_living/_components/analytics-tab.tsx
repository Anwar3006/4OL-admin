"use client";

/**
 * Healthy Living Analytics tab (Analytics/Carousels build, Phase 2).
 * Backed by GET /api/healthy-living/analytics (get_healthy_living_analytics
 * RPC). Same house layout as the Symptoms/Diseases analytics surfaces,
 * intentionally leaner: the flattened HL model has no review pipeline or
 * body-part linkage.
 */

import React from "react";
import Link from "next/link";
import KpiCard from "@/components/redesign/KpiCard";
import { useHealthyLivingAnalyticsApi } from "@/hooks/supabase-calls/useHealthyLiving";

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
          <li key={`${row.id}-${i}`} className="flex items-center gap-3 px-5 py-2.5">
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

const HealthyLivingAnalyticsTab = () => {
  const { data, isLoading, isError, error } = useHealthyLivingAnalyticsApi(true);

  if (isLoading) {
    return (
      <div className="card py-24 text-center text-xs font-bold text-slate-400">
        Loading healthy living analytics…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="card py-16 text-center">
        <p className="text-xs font-bold text-red-500">
          Failed to load analytics{error ? `: ${error.message}` : "."}
        </p>
        <p className="mt-2 text-[11px] font-semibold text-slate-400">
          Apply migration 20260822_content_analytics_carousel_extension.sql to
          enable the get_healthy_living_analytics RPC.
        </p>
      </div>
    );
  }

  const { totals, engagement, engagement_pipeline_live: pipelineLive } = data;
  const likes = pipelineLive ? engagement?.likes ?? 0 : 0;
  const saves = pipelineLive ? engagement?.saves ?? 0 : 0;
  const maxCategory = Math.max(1, ...data.categories.map((c) => c.article_count));
  const maxTrend = Math.max(1, ...data.view_trend_30d.map((t) => t.views));

  return (
    <div className="space-y-6">
      {!pipelineLive && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-bold text-amber-800">
          ℹ️ Likes/Saves read 0 until the content_engagement migration
          (Mapping Audit Part 4 / Epic 30.1) is applied. Views and coverage
          metrics below are live.
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          icon="🥗"
          label="Total Articles"
          value={totals.total.toLocaleString()}
          variant="blue"
          delta={`${totals.published.toLocaleString()} published · ${totals.draft} draft`}
          deltaType="neutral"
        />
        <KpiCard
          icon="👁️"
          label="Total Views"
          value={totals.views.toLocaleString()}
          variant="red"
          delta="Lifetime"
          deltaType="neutral"
        />
        <KpiCard
          icon="👥"
          label="Unique Viewers 30d"
          value={totals.unique_viewers_30d.toLocaleString()}
          variant="green"
          delta="Deduped per user"
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
          icon="🎠"
          label="Featured / Carousel"
          value={totals.featured.toLocaleString()}
          variant="amber"
          delta={`${totals.uncategorised} uncategorised`}
          deltaType="neutral"
        />
      </div>

      {/* 30-day unique-viewer trend */}
      <div className="card p-5 border-slate-200">
        <h4 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-4">
          📊 Unique Views — Last 30 Days
        </h4>
        {data.view_trend_30d.length === 0 ? (
          <p className="text-xs font-bold text-slate-400">
            No unique-viewer telemetry recorded yet — views populate as mobile
            users open articles (increment_healthy_living_view_count).
          </p>
        ) : (
          <>
            <div className="flex items-end gap-1 h-24">
              {data.view_trend_30d.map((day) => (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col justify-end"
                  title={`${day.date}: ${day.views} views`}
                >
                  <div
                    className="bg-emerald-500 rounded-t-sm"
                    style={{ height: `${(day.views / maxTrend) * 100}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-slate-500">
              <span>{data.view_trend_30d[0]?.date}</span>
              <span>{data.view_trend_30d[data.view_trend_30d.length - 1]?.date}</span>
            </div>
          </>
        )}
      </div>

      {/* Leaderboards + categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Leaderboard title="Top Viewed" icon="👁️" rows={data.top_viewed} unit="views" />
        <Leaderboard
          title="Top Liked"
          icon="❤️"
          rows={pipelineLive ? data.top_liked : []}
          unit="likes"
        />
        <Leaderboard
          title="Top Saved"
          icon="🔖"
          rows={pipelineLive ? data.top_saved : []}
          unit="saves"
        />
      </div>

      {/* Category breakdown */}
      <div className="card p-5 border-slate-200">
        <h4 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-4">
          📂 Articles by Category
        </h4>
        {data.categories.length === 0 ? (
          <p className="text-xs font-bold text-slate-400">
            No category linkages yet — tag articles with categories in the
            Add/Edit dialog.
          </p>
        ) : (
          <div className="space-y-2.5">
            {data.categories.map((cat) => (
              <div key={cat.category_id} className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-slate-600 w-40 truncate shrink-0">
                  {cat.category_name}
                </span>
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${(cat.article_count / maxCategory) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] font-black text-slate-700 w-8 text-right shrink-0">
                  {cat.article_count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthyLivingAnalyticsTab;
