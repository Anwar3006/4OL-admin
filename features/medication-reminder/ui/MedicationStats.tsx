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
    return <div className="h-24 animate-pulse bg-slate-100 rounded-xl mb-6 w-full"></div>;
  }

  // Helper to format deltas
  const formatDelta = (delta: number, isRate: boolean = false) => {
    const isPositive = delta > 0;
    const sign = isPositive ? "+" : "";
    const suffix = isRate ? "%" : "%";
    return {
      text: `${sign}${delta}${suffix} this month`,
      type: isPositive ? "up" : delta < 0 ? "down" : "neutral",
    } as const;
  };

  const totalDelta = formatDelta(stats.total_delta);
  const activeDelta = formatDelta(stats.active_delta);
  const adherenceDelta = formatDelta(stats.adherence_delta, true);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5 mb-6">
      <KpiCard 
        icon="💊" 
        label="Total Reminders" 
        value={stats.total_reminders.toLocaleString()} 
        variant="blue" 
        delta={totalDelta.text} 
        deltaType={totalDelta.type} 
      />
      <KpiCard 
        icon="✅" 
        label="Active Reminders" 
        value={stats.active_reminders.toLocaleString()} 
        variant="green" 
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
      />
      <KpiCard
        icon="🚩"
        label="Interaction Flags (30d)"
        value={drugStats?.interaction_flags_30d.toLocaleString() ?? "—"}
        variant="red"
        isLoading={drugLoading}
      />
      <KpiCard
        icon="🗂️"
        label="Drug Categories"
        value={drugStats?.drug_categories.toLocaleString() ?? "—"}
        variant="indigo"
        isLoading={drugLoading}
      />
    </div>
  );
}