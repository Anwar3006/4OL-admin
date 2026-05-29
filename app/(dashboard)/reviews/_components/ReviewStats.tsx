import React from "react";
import KpiCard from "@/components/redesign/KpiCard";

export default function ReviewStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 mb-4">
      <KpiCard icon="⭐" label="Platform Avg Rating" value="4.4 ⭐" variant="green" delta="+0.2 this month" deltaType="up" />
      <KpiCard icon="📊" label="Total Reviews" value="28,420" variant="blue" delta="+340 this week" deltaType="up" />
      <KpiCard icon="🚩" label="Flagged" value="12" variant="red" delta="Needs moderation" deltaType="down" />
      <KpiCard icon="⏳" label="Pending Approval" value="3" variant="gold" delta="Awaiting review" deltaType="neutral" />
    </div>
  );
}
