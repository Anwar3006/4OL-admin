import React from "react";
import KpiCard from "@/components/redesign/KpiCard";

export default function AdminStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 sm:gap-5 mb-6">
      <KpiCard icon="👥" label="Total Admins"  value="1"  variant="blue"  delta="Database reading"  deltaType="neutral" />
      <KpiCard icon="✅" label="Active"         value="1"  variant="green" delta="100% active"      deltaType="up"      />
      <KpiCard icon="⏳" label="Pending"        value="0"  variant="gold"  delta="No active invites" deltaType="neutral" />
      <KpiCard icon="🚫" label="Inactive"       value="0"  variant="red"   delta="None"             deltaType="neutral" />
      <KpiCard icon="🔓" label="MFA Not Set"    value="1"  variant="red"   delta="⚠️ Security risk" deltaType="down"    />
      <KpiCard icon="🟢" label="Online Now"     value="1"  variant="blue"  delta="Active session"   deltaType="neutral" />
    </div>
  );
}
