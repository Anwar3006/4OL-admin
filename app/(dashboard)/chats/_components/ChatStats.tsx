import React from "react";
import KpiCard from "@/components/redesign/KpiCard";

export default function ChatStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
      <KpiCard icon="📊" label="Total Groups" value="48" variant="blue" delta="+3 this month" deltaType="up" />
      <KpiCard icon="✅" label="Group Members" value="12,840" variant="green" delta="Across all groups" deltaType="up" />
      <KpiCard icon="🚩" label="Unread Support" value="5" variant="red" delta="Needs response" deltaType="down" />
      <KpiCard icon="✅" label="Avg Response" value="2m 14s" variant="green" delta="Below 5m target" deltaType="up" />
      <KpiCard icon="⏳" label="Satisfaction" value="94%" variant="gold" delta="+2% this week" deltaType="up" />
    </div>
  );
}
