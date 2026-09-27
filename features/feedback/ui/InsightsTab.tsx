"use client";

import React, { useMemo } from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useFeedbackKpi, useFeedbackPosts } from "../data/useFeedback";

// AF-02 — Insights tab: volume breakdown, top-voted open ideas and CSV export.

function downloadCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function InsightsTab() {
  const { data: kpi, isLoading } = useFeedbackKpi();
  const { data } = useFeedbackPosts({ visibility: "published", limit: 500 });
  const posts = data?.posts ?? [];

  const byCategory = useMemo(() => {
    const m: Record<string, number> = {};
    posts.forEach((p) => (m[p.category] = (m[p.category] || 0) + 1));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [posts]);

  const byModule = useMemo(() => {
    const m: Record<string, number> = {};
    posts.forEach((p) => {
      const key = p.module || "Unspecified";
      m[key] = (m[key] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [posts]);

  const maxCat = Math.max(1, ...byCategory.map(([, n]) => n));

  return (
    <div className="w-full min-w-0 space-y-6 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon="🗳️"
          label="Open Ideas"
          value={isLoading ? "..." : (kpi?.open_ideas ?? 0).toLocaleString()}
          variant="blue"
          delta="Awaiting triage"
          deltaType="neutral"
        />
        <KpiCard
          icon="⭐"
          label="Avg Review Rating"
          value={isLoading ? "..." : (kpi?.avg_review_rating ?? 0).toFixed(1)}
          variant="teal"
          delta="category = review"
          deltaType="neutral"
        />
        <KpiCard
          icon="✅"
          label="Shipped"
          value={isLoading ? "..." : (kpi?.shipped ?? 0).toLocaleString()}
          variant="green"
          delta="From user ideas"
          deltaType="neutral"
        />
        <KpiCard
          icon="📥"
          label="Published Rows"
          value={posts.length.toLocaleString()}
          variant="gold"
          delta="Exportable to CSV"
          deltaType="neutral"
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={() =>
            downloadCsv(
              `feedback-insights-${new Date().toISOString().slice(0, 10)}.csv`,
              posts.map((p) => ({
                id: p.id,
                category: p.category,
                title: p.title,
                module: p.module ?? "",
                status: p.status,
                vote_count: p.vote_count,
                rating: p.rating ?? "",
                created_at: p.created_at,
              })),
            )
          }
          className="h-9 px-4 rounded-xl text-3xs font-black uppercase tracking-widest bg-slate-800 text-white hover:bg-slate-900 transition-colors"
        >
          📥 Export Insights (CSV)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
            Volume by Category
          </h3>
          <div className="space-y-2">
            {byCategory.map(([cat, n]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="w-28 text-3xs font-black uppercase tracking-widest text-slate-500">
                  {cat}
                </span>
                <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${(n / maxCat) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-3xs font-black text-slate-600">
                  {n}
                </span>
              </div>
            ))}
            {byCategory.length === 0 && (
              <p className="text-3xs text-slate-400 font-bold uppercase tracking-widest">
                No published posts yet
              </p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
            Top-Voted Open Ideas
          </h3>
          <div className="space-y-2">
            {(kpi?.top_voted ?? []).map((t, i) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 dark:border-slate-700 px-3 py-2"
              >
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 line-clamp-1">
                  <span className="text-slate-400 mr-2">#{i + 1}</span>
                  {t.title}
                </span>
                <span className="text-3xs font-black text-emerald-600 shrink-0">
                  ▲ {t.vote_count}
                </span>
              </div>
            ))}
            {(kpi?.top_voted ?? []).length === 0 && (
              <p className="text-3xs text-slate-400 font-bold uppercase tracking-widest">
                Nothing voted yet
              </p>
            )}
          </div>

          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mt-5 mb-3">
            By Module
          </h3>
          <div className="flex flex-wrap gap-2">
            {byModule.map(([mod, n]) => (
              <span
                key={mod}
                className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-3xs font-black uppercase tracking-widest text-slate-500"
              >
                {mod} · {n}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
