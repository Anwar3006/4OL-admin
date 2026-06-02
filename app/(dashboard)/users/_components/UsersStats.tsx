import React from "react";
import KpiCard from "@/components/redesign/KpiCard";

export default function UsersStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 sm:gap-5 mb-6">
      <KpiCard icon="👥" label="Total Users"            value="6" variant="blue"  delta="Database reading"  deltaType="neutral" />
      <KpiCard icon="✅" label="Active"                  value="6" variant="green" delta="100% of total"      deltaType="up"      />
      <KpiCard icon="⭐" label="Premium"                 value="0" variant="amber" delta="Free tier only"     deltaType="neutral" />
      <KpiCard icon="⏳" label="Pending Verification"    value="0" variant="gold"  delta="All verified"       deltaType="neutral" />
      <KpiCard icon="🚩" label="Flagged"                 value="0" variant="red"   delta="None"               deltaType="neutral" />
      <KpiCard icon="🗑️" label="Delete Requests"        value="0" variant="red"   delta="None pending"       deltaType="neutral" />
    </div>
  );
}
