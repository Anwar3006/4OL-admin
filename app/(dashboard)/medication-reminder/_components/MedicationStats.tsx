"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export default function MedicationStats() {
  const { data: stats } = useQuery({
    queryKey: ["medication-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medication_reminders")
        .select("id, is_active");
      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }
      console.log("Medication data fetched:", data);
      
      return {
        total: data?.length || 0,
        active: data?.filter(r => r.is_active).length || 0
      };
    }
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 sm:gap-5 mb-6">
      <KpiCard icon="💊" label="Total Reminders" value={stats?.total?.toString() || "0"} variant="blue" delta="All time" deltaType="neutral" />
      <KpiCard icon="✅" label="Active Reminders" value={stats?.active?.toString() || "0"} variant="green" delta="Currently running" deltaType="up" />
      <KpiCard icon="⚠️" label="Adherence Rate" value="82%" variant="gold" delta="+3% this month" deltaType="up" />
    </div>
  );
}
