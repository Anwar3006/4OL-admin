"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useDrugKpiStats } from "@/features/medication-reminder/data/useDrugs";

interface MedKpiData {
  total_reminders: number;
  total_delta: number;
  active_reminders: number;
  active_delta: number;
  adherence_rate: number;
  adherence_delta: number;
}

export default function MedicationStats() {
  const { data: stats, isLoading } = useQuery<MedKpiData>({
    queryKey: ["medication-kpi-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_medication_kpi_stats");
      if (error) {
        console.error("Error fetching KPI stats:", error);
        throw error;
      }
      return data as MedKpiData;
    }
  });

  // Drug catalog KPIs (Gap Analysis B.7) — drugs in DB, categories, flags.
  const { data: drugStats, isLoading: drugLoading } = useDrugKpiStats();

  if (isLoading || !stats) {
    return <div className="h-24 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl mb-6 w-full"></div>;
  }

  // Helper to format deltas. A real zero-change reading is "flat" (amber) —
  // a distinct signal from "neutral" (no comparison available at all) — not
  // "neutral", since get_medication_kpi_stats always returns a genuine
  // month-over-month delta here, even when that delta is exactly 0.
  const formatDelta = (delta: number, isRate: boolean = false) => {
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
        get_medication_kpi_stats's SQL isn't tracked in this repo (it's not
        in supabase/migrations/), but database.types.ts types its return as
        a scalar object, not a series — there's no per-day history behind
        these numbers to chart, only the month-over-month delta already
        shown as text.

        Interaction Flags (30d) stays a plain number too: drug_interaction_
        flags does have a real per-row flagged_at (supabase/migrations/
        20260820_medication_drug_catalog.sql), but get_drug_kpi_stats only
        returns the 30-day count, not the rows — charting it needs a new RPC
        + migration, out of scope for a card-layout pass. This page's top
        RPC also still goes through the legacy anon client (lib/supabase.ts,
        CLAUDE.md's one remaining caller) — not touched here since this is a
        layout-only change, not a data-fetching one.
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