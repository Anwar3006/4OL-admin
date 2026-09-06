"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { useTransactionsOverview } from "@/features/transactions/data/useTransactions";
import { formatCurrency } from "@/lib/format";

const HIDDEN_VALUE = "🔒 Hidden";

export default function TransactionStats() {
  const { data } = useTransactionsOverview();
  const kpis = data?.overview?.kpis;

  const formatMoney = (value: number | null | undefined) =>
    formatCurrency(value, { fallback: "—" });
  const formatCount = (value: number | null | undefined) =>
    value === null || value === undefined ? "—" : Number(value).toLocaleString();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      <KpiCard
        icon="💳"
        label="Total Transactions"
        value={kpis?.total_transactions_hidden ? HIDDEN_VALUE : formatCount(kpis?.total_transactions)}
        variant="blue"
      />
      <KpiCard
        icon="₵"
        label="Total Revenue"
        value={kpis?.total_revenue_hidden ? HIDDEN_VALUE : formatMoney(kpis?.total_revenue)}
        variant="green"
      />
      <KpiCard
        icon="👥"
        label="Total Customers"
        value={kpis?.total_customers_hidden ? HIDDEN_VALUE : formatCount(kpis?.total_customers)}
        variant="purple"
      />
      <KpiCard
        icon="📈"
        label="Gross Profit"
        value={kpis?.gross_profit_hidden ? HIDDEN_VALUE : formatMoney(kpis?.gross_profit)}
        variant="teal"
      />
    </div>
  );
}
