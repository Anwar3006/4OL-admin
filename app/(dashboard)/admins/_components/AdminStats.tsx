import React from "react";
import KpiCard from "@/components/redesign/KpiCard";

export default function AdminStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 sm:gap-5 mb-6">
      <KpiCard icon="👥" label="Total Admins"  value="6"  variant="blue"  delta="+1 this month"    deltaType="neutral" />
      <KpiCard icon="✅" label="Active"         value="4"  variant="green" delta="All verified"      deltaType="up"      />
      <KpiCard icon="⏳" label="Pending"        value="1"  variant="gold"  delta="Awaiting 2FA"      deltaType="neutral" />
      <KpiCard icon="🚫" label="Inactive"       value="1"  variant="red"   delta="Last 30d+"         deltaType="down"    />
      <KpiCard icon="🔓" label="MFA Not Set"    value="2"  variant="red"   delta="⚠️ High Risk"     deltaType="down"    />
      <KpiCard icon="🟢" label="Online Now"     value="3"  variant="blue"  delta="Active sessions"   deltaType="neutral" />
    </div>
  );
}
