"use client";

import React, { useState } from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { transactionColumns } from "@/components/Data-Table/columns/transactionColumns";
import KpiCard from "@/components/redesign/KpiCard";
import {
  useTransactions,
  useTransactionsOverview,
} from "@/hooks/supabase-calls/useTransactions";

const PLANS = [
  { value: "", label: "All Plans" },
  { value: "free", label: "Free" },
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
  { value: "elite", label: "Elite" },
];

const TYPES = [
  { value: "", label: "All Events" },
  { value: "new", label: "New" },
  { value: "renewal", label: "Renewal" },
  { value: "upgrade", label: "Upgrade" },
  { value: "downgrade", label: "Downgrade" },
];

export default function SubscriptionsTab() {
  const [plan, setPlan] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const { data: overview } = useTransactionsOverview();

  const { data, isLoading, isError, error } = useTransactions({
    page,
    limit: 25,
    category: "subscription_fee",
  });

  // Client-side plan/type refinement on top of the category query.
  const rows = (data?.rows ?? []).filter((row) => {
    if (plan && row.plan_key !== plan) return false;
    if (type && (row.txn_type_detail ?? "new") !== type) return false;
    return true;
  });

  const subKpis = overview?.overview?.subscriptions;
  const hidden = Boolean(overview?.overview?.subscriptions_hidden);
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / 25));

  return (
    <div className="w-full min-w-0 space-y-6 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {hidden ? (
          <div className="col-span-full card py-8 text-center">
            <div className="text-2xl mb-2">🔒</div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Subscription KPIs hidden by Super Admin
            </p>
          </div>
        ) : (
          <>
            <KpiCard icon="🔁" label="Renewals (MTD)" value={String(subKpis?.renewals_mtd ?? 0)} variant="green" />
            <KpiCard icon="✨" label="New Subs (MTD)" value={String(subKpis?.new_mtd ?? 0)} variant="blue" />
            <KpiCard icon="⬆️" label="Upgrades (MTD)" value={String(subKpis?.upgrades_mtd ?? 0)} variant="purple" />
            <KpiCard icon="📉" label="Churn Rate" value={`${subKpis?.churn_pct ?? 0}%`} variant="red" />
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={plan}
          onChange={(e) => {
            setPlan(e.target.value);
            setPage(1);
          }}
          className="h-9 px-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest bg-white outline-none"
        >
          {PLANS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="h-9 px-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest bg-white outline-none"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
          Consumer subscription payments from the unified ledger
        </span>
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable
          columns={transactionColumns}
          data={rows}
          isLoading={isLoading}
          isError={isError}
          error={error}
          pagination={{
            currentPage: page,
            totalPages,
            totalItems: data?.total ?? 0,
            pageSize: 25,
            onPageChange: setPage,
            onNextPage: () => setPage((p) => Math.min(p + 1, totalPages)),
            onPreviousPage: () => setPage((p) => Math.max(p - 1, 1)),
            canNextPage: page < totalPages,
            canPreviousPage: page > 1,
          }}
        />
        {rows.length === 0 && !isLoading && (
          <div className="p-6 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            No subscription payments match these filters.
          </div>
        )}
      </div>
    </div>
  );
}
