"use client";

import React from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { facilitySubscriptionColumns } from "@/components/Data-Table/columns/facilitySubscriptionColumns";
import { useFacilitySubscriptions } from "@/hooks/supabase-calls/useFacilitySubscriptions";
import { usePagination } from "@/hooks/use-pagination";
import KpiCard from "@/components/redesign/KpiCard";

export interface SubscriptionRow {
  id: string;
  facility: string;
  plan: string;
  value: string;
  date: string;
  status: string;
}

export default function SubscriptionsTab() {
  const { page, onPageChange, onNextPage, onPreviousPage, pageSize } =
    usePagination({
      key: "facility-subs-page",
    });
  const { data, isLoading, isError, error } = useFacilitySubscriptions({
    page,
    limit: pageSize,
  });

  const subscriptions = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;

  // Calculate KPI values from real data
  const activeCount = subscriptions.filter((s) => s.status === "active").length;
  const totalValue = subscriptions
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + (s.subscription?.price || 0), 0);

  return (
    <div className="w-full min-w-0 space-y-6 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon="✅"
          label="Active Subscriptions"
          value={activeCount.toString()}
          variant="green"
        />
        <KpiCard
          icon="💸"
          label="Total Value (MTD)"
          value={`₵${totalValue.toLocaleString()}`}
          variant="blue"
        />
        <KpiCard
          icon="📊"
          label="Pending"
          value={subscriptions
            .filter((s) => s.status === "pending_payment")
            .length.toString()}
          variant="purple"
        />
        <KpiCard
          icon="📉"
          label="Expired"
          value={subscriptions
            .filter((s) => s.status === "expired")
            .length.toString()}
          variant="red"
        />
      </div>
      <div className="card p-0 overflow-hidden">
        <DataTable
          columns={facilitySubscriptionColumns}
          data={subscriptions}
          isLoading={isLoading}
          isError={isError}
          error={error}
          selectable
        />
      </div>
    </div>
  );
}
