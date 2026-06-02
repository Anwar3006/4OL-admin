import React from "react";
import KpiCard from "@/components/redesign/KpiCard";

export default function DeleteRequestStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
      <KpiCard icon="⏳" label="Pending Review" value="4" variant="gold" delta="Awaiting action" deltaType="down" />
      <KpiCard icon="📊" label="In Verification" value="2" variant="blue" delta="OTP sent" deltaType="neutral" />
      <KpiCard icon="📊" label="In Grace Period" value="3" variant="purple" delta="30-day window" deltaType="neutral" />
      <KpiCard icon="✅" label="Completed" value="41" variant="green" delta="All time" deltaType="up" />
      <KpiCard icon="📋" label="Cancelled" value="6" variant="red" delta="User withdrew" deltaType="neutral" />
    </div>
  );
}
