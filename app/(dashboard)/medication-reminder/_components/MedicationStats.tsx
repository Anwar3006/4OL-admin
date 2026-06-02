import React from "react";
import KpiCard from "@/components/redesign/KpiCard";

export default function MedicationStats() {
  return (
    /* 2 cols on mobile → 3 on md → 6 on xl (same ratio as facilities) */
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
      <KpiCard icon="📊" label="Drugs in Database"      value="4,820"  variant="blue"   delta="+42 this month"  deltaType="up"      />
      <KpiCard icon="✅" label="Active Reminders"        value="12,400" variant="green"  delta="+820 this month" deltaType="up"      />
      <KpiCard icon="🤖" label="AI Accuracy"             value="98.1%"  variant="purple" delta="v1.8 active"     deltaType="up"      />
      <KpiCard icon="🚩" label="Interaction Flags (30d)" value="284"    variant="red"    delta="Flagged to users" deltaType="neutral" />
      <KpiCard icon="⏳" label="Reminder Adherence"      value="82%"    variant="gold"   delta="+3% this month"  deltaType="up"      />
      <KpiCard icon="💊" label="Drug Categories"         value="620"    variant="teal"   delta="Well indexed"     deltaType="neutral" />
    </div>
  );
}
