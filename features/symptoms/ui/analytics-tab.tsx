"use client";

/**
 * Symptoms Analytics tab (Analytics/Carousels build, Phase 2).
 * Backed by GET /api/symptoms/analytics (get_symptom_analytics RPC) — the
 * single definition source for every Symptoms KPI. Layout mirrors the
 * Diseases Engagement tab: KPI grid → 30-day trend → distribution bars →
 * leaderboards → content health. Body-part bars deep-link into the Anatomy
 * menu; category bars deep-link into the Categories tab (Phase 4).
 */

import React from "react";
import Link from "next/link";
import KpiCard from "@/components/redesign/KpiCard";
import { useSymptomAnalyticsApi } from "@/features/symptoms/data/useSymptoms";

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
            <Link
              href={`/symptoms?id=${row.id}`}
              className="text-xs font-bold text-slate-800 truncate flex-1 hover:text-emerald-700"
            >
              {row.name}
            </Link>
            <span className="text-xs font-black text-slate-600 shrink-0">
              {row.value.toLocaleString()} {unit}
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const SymptomAnalyticsTab = () => {
  const { data, isLoading, isError, error } = useSymptomAnalyticsApi(true);

  if (isLoading) {
    return (
      <div className="card py-24 text-center text-xs font-bold text-slate-400">
        Loading symptoms analytics…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="card py-16 text-center">
        <p className="text-xs font-bold text-red-500">
          Failed to load analytics{error ? `: ${error.message}` : "."}
        </p>
        <p className="mt-2 text-xs font-semibold text-slate-400">
          Apply migration 20260822_content_analytics_carousel_extension.sql to
          enable the get_symptom_analytics RPC.
        </p>
      </div>
    );
  }

  const { totals, engagement, engagement_pipeline_live: pipelineLive } = data;
  const likes = pipelineLive ? engagement?.likes ?? 0 : 0;
  const saves = pipelineLive ? engagement?.saves ?? 0 : 0;
  const maxBodyPart = Math.max(1, ...data.body_parts.map((b) => b.symptom_count));
  const maxCategory = Math.max(1, ...data.categories.map((c) => c.symptom_count));
  const maxTrend = Math.max(1, ...data.view_trend_30d.map((t) => t.views));

  return (
    <div className="space-y-6">
      {!pipelineLive && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
          ℹ️ Likes/Saves read 0 until the content_engagement migration
          (Mapping Audit Part 4 / Epic 30.1) is applied. Views, verification
          and coverage metrics below are live.
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon="🩺"
          label="Total Symptoms"
          value={totals.total.toLocaleString()}
          variant="blue"
          delta={`${totals.published.toLocaleString()} published · ${totals.draft} draft`}
          deltaType="neutral"
        />
        <KpiCard
          icon="⏳"
          label="Pending Review"
          value={totals.pending_review.toLocaleString()}
          variant="amber"
          delta="Editorial backlog"
          deltaType="neutral"
        />
        <KpiCard
          icon="👁️"
          label="Total Views"
          value={totals.views.toLocaleString()}
          variant="red"
          delta={`${totals.unique_viewers_30d.toLocaleString()} unique viewers 30d`}
          deltaType="neutral"
        />
        <KpiCard
          icon="✅"
          label="Verification Rate"
          value={`${data.verification_rate}%`}
          variant="green"
          delta={`${totals.reviewed.toLocaleString()} reviewed`}
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
          icon="🌐"
          label="Systemic"
          value={totals.systemic.toLocaleString()}
          variant="blue"
          delta={`${totals.total - totals.systemic} localised`}
          deltaType="neutral"
        />
        <KpiCard
          icon="🎠"
          label="Featured / Carousel"
          value={totals.featured.toLocaleString()}
          variant="green"
          delta={`${totals.uncategorised} uncategorised`}
          deltaType="neutral"
        />
      </div>

      {/* 30-day unique-viewer trend */}
      <div className="card p-5 border-slate-200">
        <h4 className="section-heading mb-4">
          📊 Unique Views — Last 30 Days
        </h4>
        {data.view_trend_30d.length === 0 ? (
          <p className="text-xs font-bold text-slate-400">
            No unique-viewer telemetry recorded yet — views populate as mobile
            users open symptom articles (increment_symptom_view_count).
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
            <div className="mt-3 flex items-center justify-between text-2xs font-bold text-slate-500">
              <span>{data.view_trend_30d[0]?.date}</span>
              <span>{data.view_trend_30d[data.view_trend_30d.length - 1]?.date}</span>
            </div>
          </>
        )}
      </div>

      {/* Body-part distribution + category breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5 border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="section-heading">
              🧍 Symptoms by Body Part
            </h4>
            <Link
              href="/anatomy?tab=symptoms"
              className="text-2xs font-black uppercase tracking-widest text-emerald-700 hover:underline"
            >
              Open Anatomy →
            </Link>
          </div>
          {data.body_parts.length === 0 ? (
            <p className="text-xs font-bold text-slate-400">
              No symptom ↔ body-part links yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {data.body_parts.map((part) => (
                <div key={part.body_part_id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-600 w-40 truncate shrink-0">
                    {part.body_part_name}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-purple-400"
                      style={{ width: `${(part.symptom_count / maxBodyPart) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-slate-700 w-8 text-right shrink-0">
                    {part.symptom_count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5 border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="section-heading">
              📂 Symptoms by Category
            </h4>
            <Link
              href="/symptoms?tab=categories"
              className="text-2xs font-black uppercase tracking-widest text-emerald-700 hover:underline"
            >
              Open Categories →
            </Link>
          </div>
          {data.categories.length === 0 ? (
            <p className="text-xs font-bold text-slate-400">
              No category linkages yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {data.categories.map((cat) => (
                <div key={cat.category_id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-600 w-40 truncate shrink-0">
                    {cat.category_name}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${(cat.symptom_count / maxCategory) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-slate-700 w-8 text-right shrink-0">
                    {cat.symptom_count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Leaderboards */}
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

      {/* Content health */}
      <div className="card p-5 border-slate-200">
        <h4 className="section-heading mb-4">
          🧾 Content Health — Section Completeness
        </h4>
        <p className="text-xs font-bold text-slate-500 mb-3">
          Published symptoms average{" "}
          <span className="text-emerald-700">
            {Number(data.completeness.avg_sections ?? 0).toFixed(1)} / 8
          </span>{" "}
          Lexical sections filled. Items below are missing the most content —
          click to open and complete them.
        </p>
        {data.completeness.incomplete.length === 0 ? (
          <p className="text-xs font-bold text-slate-400">
            Every published symptom has at least 6 of 8 sections filled. 🎉
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.completeness.incomplete.map((row) => (
              <li key={row.id} className="flex items-center gap-3 py-2">
                <Link
                  href={`/symptoms?id=${row.id}`}
                  className="text-xs font-bold text-slate-800 truncate flex-1 hover:text-emerald-700"
                >
                  {row.name}
                </Link>
                <span
                  className={
                    row.sections <= 3 ? "badge badge-red" : "badge badge-amber"
                  }
                >
                  {row.sections}/8 sections
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SymptomAnalyticsTab;
