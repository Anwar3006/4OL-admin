import React from "react";
import KpiCard from "@/components/redesign/KpiCard";

export default function FAQStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <KpiCard icon="📊" label="Active FAQs" value="20" variant="blue" delta="Platform-specific" deltaType="up" />
      <KpiCard icon="✅" label="AI Deflection Rate" value="41%" variant="green" delta="Reduces tickets" deltaType="up" />
      <KpiCard icon="⏳" label="Categories" value="9" variant="gold" delta="Organized" deltaType="neutral" />
      <KpiCard icon="📊" label="Views This Month" value="6,280" variant="teal" delta="+18%" deltaType="up" />
    </div>
  );
}
