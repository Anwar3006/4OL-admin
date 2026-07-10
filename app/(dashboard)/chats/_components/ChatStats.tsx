import React from "react";
import KpiCard from "@/components/redesign/KpiCard";

export default function ChatStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6">
      <KpiCard
        icon="📊"
        label="Total Groups"
        value={0}
        variant="blue"
        delta=""
        deltaType="up"
      />
      <KpiCard
        icon="✅"
        label="Group Members"
        value={0}
        variant="green"
        delta="Across all groups"
        deltaType="up"
      />
      <KpiCard
        icon="🚩"
        label="Unread Support"
        value={0}
        variant="red"
        delta="Needs response"
        deltaType="down"
      />
      <KpiCard
        icon="✅"
        label="Avg Response"
        value=""
        variant="green"
        delta=""
        deltaType="up"
      />
    </div>
  );
}
