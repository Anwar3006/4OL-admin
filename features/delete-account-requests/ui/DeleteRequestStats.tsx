"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import KpiCard from "@/components/redesign/KpiCard";
import { getBrowserClient } from "@/lib/db/browser";

interface DeleteAccountRequestStatsData {
  pending_review: number;
  in_verification: number;
  grace_period: number;
  completed: number;
  cancelled: number;
  total: number;
}

export default function DeleteRequestStats() {
  const { data: stats, isLoading, isError } = useQuery<DeleteAccountRequestStatsData>({
    queryKey: ["delete-account-request-stats"],
    queryFn: async () => {
      const supabase = await getBrowserClient();
      const { data, error } = await supabase.rpc("get_delete_account_request_stats");
      if (error) throw error;
      return data as DeleteAccountRequestStatsData;
    },
  });

  if (isLoading) {
    return <div className="h-24 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl mb-6 w-full" />;
  }

  if (isError || !stats) {
    return (
      <div className="h-24 flex items-center justify-center rounded-xl mb-6 w-full bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 text-sm">
        Failed to load delete-account-request stats.
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-6">
      {/*
        No trend: get_delete_account_request_stats is a pure current-state
        count() FILTER (...) over delete_account_requests — no created_at
        bucketing, no stored history of past counts — so there's nothing
        genuine to chart (supabase/migrations/20260905_reapply_epic21_delete_account_vocabulary.sql).
        Pending Review and In Grace Period get the primary slots: they're
        the in-flight requests an admin must act on before a deadline
        (grace period is a running 30-day countdown); Completed/Cancelled
        are settled history and stay small.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <KpiCard
          icon="⏳"
          label="Pending Review"
          value={stats.pending_review.toLocaleString()}
          variant="gold"
          size="default"
          delta="Awaiting first look"
          deltaType="neutral"
        />
        <KpiCard
          icon="⏱️"
          label="In Grace Period"
          value={stats.grace_period.toLocaleString()}
          variant="purple"
          size="default"
          delta="30-day window"
          deltaType="neutral"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <KpiCard
          icon="📊"
          label="In Verification"
          value={stats.in_verification.toLocaleString()}
          variant="blue"
          size="sm"
          delta="Identity check in progress"
          deltaType="neutral"
        />
        <KpiCard
          icon="✅"
          label="Completed"
          value={stats.completed.toLocaleString()}
          variant="green"
          size="sm"
          delta="All time"
          deltaType="up"
        />
        <KpiCard
          icon="📋"
          label="Cancelled"
          value={stats.cancelled.toLocaleString()}
          variant="red"
          size="sm"
          delta="Withdrawn or rejected"
          deltaType="neutral"
        />
      </div>
    </div>
  );
}
