import React from "react";
import KpiCard from "@/components/redesign/KpiCard";

export default function MarketingStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5 mb-6">
      <KpiCard icon="⏳" label="Draft" value="4" variant="amber" delta="Ready to launch" deltaType="neutral" />
      <KpiCard icon="✅" label="Live" value="2" variant="green" delta="Running now" deltaType="up" />
      <KpiCard icon="📊" label="Paused" value="1" variant="blue" delta="Manually paused" deltaType="neutral" />
      <KpiCard icon="📊" label="Ended" value="8" variant="teal" delta="Completed" deltaType="neutral" />
      <KpiCard icon="📢" label="Pending Review" value="2" variant="orange" delta="Business submissions" deltaType="down" />
    </div>
  );
}
