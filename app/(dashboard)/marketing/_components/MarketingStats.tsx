"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export default function MarketingStats() {
  const { data: stats } = useQuery({
    queryKey: ["marketing-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_profile")
        .select("status");
      if (error) throw error;
      
      const counts = {
        draft: data.filter(r => r.status === 'draft').length,
        live: data.filter(r => r.status === 'live').length,
        paused: data.filter(r => r.status === 'paused').length,
        ended: data.filter(r => r.status === 'ended').length,
        total: data.length
      };
      return counts;
    }
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5 mb-6">
      <KpiCard icon="⏳" label="Draft" value={stats?.draft || 0} variant="amber" delta="Ready to launch" deltaType="neutral" />
      <KpiCard icon="✅" label="Live" value={stats?.live || 0} variant="green" delta="Running now" deltaType="up" />
      <KpiCard icon="⏸️" label="Paused" value={stats?.paused || 0} variant="blue" delta="Manually paused" deltaType="neutral" />
      <KpiCard icon="📊" label="Ended" value={stats?.ended || 0} variant="teal" delta="Completed" deltaType="neutral" />
      <KpiCard icon="📢" label="Total" value={stats?.total || 0} variant="indigo" delta="All time" deltaType="neutral" />
    </div>
  );
}
