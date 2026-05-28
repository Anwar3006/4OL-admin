import React from "react";
import KpiCard from "@/components/redesign/KpiCard";

export default function TransactionStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      <KpiCard icon="💳" label="Total Transactions" value="3,841" variant="blue" delta="+18.2% vs last month" deltaType="up" />
      <KpiCard icon="₵" label="Total Revenue" value="₵142,800" variant="green" delta="+11.4% vs last month" deltaType="up" />
      <KpiCard icon="👥" label="Total Customers" value="12,480" variant="purple" delta="+8.4% vs last month" deltaType="up" />
      <KpiCard icon="📈" label="Gross Profit" value="₵127,540" variant="teal" delta="+18.2% vs last month" deltaType="up" />
    </div>
  );
}
