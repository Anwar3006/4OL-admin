"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useDrugKpiStats } from "@/features/medication-reminder/data/useDrugs";

/**
 * AI Checker tab (Gap Analysis B.1 tab 5). Accuracy and response time are
 * not instrumented — nothing logs verdict correctness against ground truth
 * or per-request latency — so they render "—" until that pipeline exists
 * (Epic 5.1). Pair counts and flags come from the drug catalog KPI RPC.
 */
export default function AICheckerTab() {
  const { data: stats, isLoading } = useDrugKpiStats();

  return (
    <div className="space-y-5 mt-4">
      {/* Gradient status banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 text-white p-6 shadow-md">
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/15 dark:bg-slate-800/15 flex items-center justify-center text-2xl shrink-0">
            🤖
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-black tracking-tight">
              Drug Interaction Checker AI v1.8 — Active
            </div>
            <div className="text-xs text-emerald-100 font-medium mt-0.5">
              Real-time interaction screening on every reminder ·{" "}
              {stats ? `${stats.interaction_pairs.toLocaleString()} interaction pairs indexed` : "indexing catalog…"}
            </div>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon="🎯"
          label="AI Accuracy"
          value="—"
          isEmpty
          emptyLabel="—"
          delta="Not instrumented — no ground-truth verdict log yet"
          variant="green"
          isLoading={isLoading}
        />
        <KpiCard
          icon="🔗"
          label="Interaction Pairs"
          value={stats?.interaction_pairs.toLocaleString() ?? "—"}
          variant="blue"
          isLoading={isLoading}
        />
        <KpiCard
          icon="🚩"
          label="Flags Issued (30d)"
          value={stats?.interaction_flags_30d.toLocaleString() ?? "—"}
          variant="amber"
          isLoading={isLoading}
        />
        <KpiCard
          icon="⚡"
          label="Avg Response Time"
          value="—"
          isEmpty
          emptyLabel="—"
          delta="Not instrumented — no request latency log yet"
          variant="purple"
          isLoading={isLoading}
        />
      </div>

      {/* Clinical review notice */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-500/15 px-4 py-3 text-xs text-blue-800 dark:text-blue-400 font-medium">
        <span>ℹ️</span>
        <span>
          Interaction verdicts undergo <strong>monthly pharmacist review</strong>{" "}
          before being promoted to the live checker. v2.0 (Q3 2026) will expand
          Ghanaian drug coverage with local brand-name mappings and ATC
          cross-references.
        </span>
      </div>
    </div>
  );
}
