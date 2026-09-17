"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useTransactionsOverview } from "@/features/transactions/data/useTransactions";
import { formatCurrency } from "@/lib/format";

const HIDDEN_VALUE = "🔒 Hidden";

export default function TransactionStats() {
  const { data } = useTransactionsOverview();
  const kpis = data?.overview?.kpis;
  const monthly = data?.overview?.monthly;

  const formatMoney = (value: number | null | undefined) =>
    formatCurrency(value, { fallback: "—" });
  const formatCount = (value: number | null | undefined) =>
    value === null || value === undefined ? "—" : Number(value).toLocaleString();

  // Real month-over-month revenue trend: `monthly` is computed server-side
  // in get_transactions_overview() (supabase/migrations/
  // 20260822_transactions_ledger.sql) — a `group by date_trunc('month',
  // processed_at)` over the last 6 months, backed by
  // idx_transactions_processed_at, returned in the SAME overview call this
  // page already makes (zero new queries). Hidden whenever the SA has
  // masked the revenue KPI or the revenue_chart metric specifically for
  // this role (finance_visibility_config via METRIC_MAP in
  // app/api/transactions/overview) — otherwise the chart would leak a
  // number the headline is deliberately hiding.
  const revenueHidden = Boolean(kpis?.total_revenue_hidden || data?.overview?.monthly_hidden);
  const revenueTrend =
    !revenueHidden && monthly && monthly.length > 0
      ? monthly.map((m) => ({ label: m.month, value: m.revenue }))
      : undefined;
  const lastMonthRevenue = monthly?.[monthly.length - 1]?.revenue ?? 0;
  const prevMonthRevenue = monthly?.[monthly.length - 2]?.revenue ?? 0;
  const revenueMomPct =
    prevMonthRevenue > 0 ? Math.round(((lastMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100) : null;
  // "flat" (zero change, a real month-over-month comparison) is a distinct
  // amber signal from "neutral" (no prior month to compare against yet).
  const revenueDirection: "up" | "down" | "flat" | "neutral" =
    !monthly || monthly.length < 2
      ? "neutral"
      : lastMonthRevenue > prevMonthRevenue
        ? "up"
        : lastMonthRevenue < prevMonthRevenue
          ? "down"
          : "flat";
  const revenueDeltaText =
    !monthly || monthly.length < 2
      ? undefined
      : revenueMomPct != null
        ? `${Math.abs(revenueMomPct)}% vs last month`
        : lastMonthRevenue > 0
          ? "New revenue vs ₵0 last month"
          : "No change vs last month";

  return (
    <div className="space-y-4 mb-4">
      <KpiCard
        icon="₵"
        label="Total Revenue"
        value={kpis?.total_revenue_hidden ? HIDDEN_VALUE : formatMoney(kpis?.total_revenue)}
        variant="green"
        delta={kpis?.total_revenue_hidden ? undefined : revenueDeltaText}
        deltaType={revenueDirection}
        trend={revenueTrend}
        size={revenueHidden ? "default" : "lg"}
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          icon="💳"
          label="Total Transactions"
          value={kpis?.total_transactions_hidden ? HIDDEN_VALUE : formatCount(kpis?.total_transactions)}
          variant="blue"
          size="sm"
        />
        <KpiCard
          icon="👥"
          label="Total Customers"
          value={kpis?.total_customers_hidden ? HIDDEN_VALUE : formatCount(kpis?.total_customers)}
          variant="purple"
          size="sm"
        />
        {/*
          Gross Profit stays plain: it's revenue minus refunds minus
          operational expenses, and only the revenue half has a monthly
          breakdown — refunds/expenses are all-time totals with no
          `group by month` behind them, so a "gross profit trend" would be
          half-real, half-flat-lined. Not charting it. Full weight (no
          `size`) because it's still one of the two headline numbers.
        */}
        <KpiCard
          icon="📈"
          label="Gross Profit"
          value={kpis?.gross_profit_hidden ? HIDDEN_VALUE : formatMoney(kpis?.gross_profit)}
          variant="teal"
        />
      </div>
    </div>
  );
}
