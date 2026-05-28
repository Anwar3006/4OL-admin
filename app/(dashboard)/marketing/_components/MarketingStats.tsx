import React from "react";
import KpiCard from "@/components/redesign/KpiCard";

export default function MarketingStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
      <KpiCard icon="⏳" label="Draft" value="4" variant="amber" delta="Ready to launch" deltaType="neutral" />
      <KpiCard icon="✅" label="Live" value="2" variant="green" delta="Running now" deltaType="up" />
      <KpiCard icon="📊" label="Paused" value="1" variant="blue" delta="Manually paused" deltaType="neutral" />
      <KpiCard icon="📊" label="Ended" value="8" variant="slate" delta="Completed" deltaType="neutral" />
      <KpiCard icon="📢" label="Pending Review" value="2" variant="orange" delta="Business submissions" deltaType="down" />
    </div>
  );
}
