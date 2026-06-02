import React from "react";
import KpiCard from "@/components/redesign/KpiCard";

export default function UsersStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
      <KpiCard icon="👥" label="Total Users"            value="45,234" variant="blue"  delta="+12.4% this month" deltaType="up"      />
      <KpiCard icon="✅" label="Active"                  value="38,120" variant="green" delta="84% of total"       deltaType="up"      />
      <KpiCard icon="⭐" label="Premium"                 value="4,812"  variant="amber" delta="+8.2% this month"  deltaType="up"      />
      <KpiCard icon="⏳" label="Pending Verification"    value="560"    variant="gold"  delta="Email / Profile"    deltaType="neutral" />
      <KpiCard icon="🚩" label="Flagged"                 value="12"     variant="red"   delta="⚠️ Needs review"   deltaType="down"    />
      <KpiCard icon="🗑️" label="Delete Requests"        value="1"      variant="red"   delta="GH-DPA 2012"        deltaType="down"    />
    </div>
  );
}
