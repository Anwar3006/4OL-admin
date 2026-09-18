"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useQuery } from "@tanstack/react-query";
import { useDrugKpiStats } from "@/features/medication-reminder/data/useDrugs";
import { apiFetch } from "@/lib/api-fetch";

interface MedKpiData {
  total_reminders: number;
  total_delta: number | null;
  active_reminders: number;
  active_delta: number | null;
  adherence_rate: number;
  adherence_delta: number | null;
}

export default function MedicationStats() {
  const { data: stats, isLoading, isError } = useQuery<MedKpiData>({
    queryKey: ["medication-kpi-stats"],
    queryFn: () => apiFetch<MedKpiData>("/api/medication/stats"),
  });

  // Drug catalog KPIs (Gap Analysis B.7) — drugs in DB, categories, flags.
  const { data: drugStats, isLoading: drugLoading } = useDrugKpiStats();

  if (isLoading) {
    return <div className="h-24 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl mb-6 w-full"></div>;
  }

  if (isError || !stats) {
    return (
      <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
        Medication KPI totals could not be loaded. The reminder table remains available below.
      </div>
    );
  }

  // Helper to format deltas. A real zero-change reading is "flat" (amber) —
  // a distinct signal from "neutral" (no comparison available at all) — not
  // "neutral", since get_medication_kpi_stats always returns a genuine
  // month-over-month delta here, even when that delta is exactly 0.
  const formatDelta = (delta: number | null, isRate: boolean = false) => {
    if (delta == null) {
      return { text: "Comparison unavailable", type: "neutral" } as const;
    }
    const isPositive = delta > 0;
    const sign = isPositive ? "+" : "";
    const suffix = isRate ? "%" : "%";
    return {
      text: delta === 0 ? "No change this month" : `${sign}${delta}${suffix} this month`,
      type: isPositive ? "up" : delta < 0 ? "down" : "flat",
    } as const;
  };

  const activeDelta = formatDelta(stats.active_delta);
  const adherenceDelta = formatDelta(stats.adherence_delta, true);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5 mb-6">
      {/*
        Active / Total Reminders merges into one fraction card — active is a
        subset of total, so a separate card for each just repeats the same
        story (matches BedTrackerPage's "Facilities Online" precedent).
        The server route uses get_medication_kpi_stats when available and
        falls back to direct aggregate counts when a connected project has
        an older or stale RPC definition.

        Interaction Flags (30d) stays a plain number too: drug_interaction_
        flags does have a real per-row flagged_at (supabase/migrations/
        20260820_medication_drug_catalog.sql), but get_drug_kpi_stats only
        returns the 30-day count, not the rows — charting it needs a new RPC
        + migration, out of scope for a card-layout pass. This page's top
        RPC access is server-side and permission checked, so the browser does
        not call an admin aggregate through the anonymous client.
      */}
      <KpiCard
        icon="💊"
        label="Active / Total Reminders"
        value={`${stats.active_reminders.toLocaleString()} / ${stats.total_reminders.toLocaleString()}`}
        variant="blue"
        delta={activeDelta.text}
        deltaType={activeDelta.type}
      />
      <KpiCard
        icon="⚠️"
        label="Platform Adherence Rate"
        value={`${stats.adherence_rate}%`}
        variant="gold"
        delta={adherenceDelta.text}
        deltaType={adherenceDelta.type}
      />
      <KpiCard
        icon="💊"
        label="Drugs in Database"
        value={drugStats?.drugs_in_db.toLocaleString() ?? "—"}
        variant="teal"
        isLoading={drugLoading}
        size="sm"
      />
      <KpiCard
        icon="🚩"
        label="Interaction Flags (30d)"
        value={drugStats?.interaction_flags_30d.toLocaleString() ?? "—"}
        variant="red"
        isLoading={drugLoading}
        size="sm"
      />
      <KpiCard
        icon="🗂️"
        label="Drug Categories"
        value={drugStats?.drug_categories.toLocaleString() ?? "—"}
        variant="indigo"
        isLoading={drugLoading}
        size="sm"
      />
    </div>
  );
}
