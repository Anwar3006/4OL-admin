import React from "react";
import KpiCard from "@/components/redesign/KpiCard";

export default function TaskStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <KpiCard icon="📥" label="New Tasks" value="4" variant="blue" delta="Awaiting action" deltaType="neutral" />
      <KpiCard icon="⚙️" label="In Progress" value="6" variant="gold" delta="Active work" deltaType="neutral" />
      <KpiCard icon="🔍" label="Under Review" value="3" variant="purple" delta="SA sign-off" deltaType="neutral" />
      <KpiCard icon="✅" label="Completed" value="12" variant="green" delta="This quarter" deltaType="up" />
    </div>
  );
}
