"use client";

/**
 * Marketing → Subscriptions tab — mockup parity build (KPI row, plan cards,
 * All Subscribers / At Risk / Billing History sub-tabs, filters, export).
 * Backed by the unified user_subscriptions ⋈ subscription_tiers routes
 * (marketing unification build). Billing History is deferred (M-D5/K-D7 —
 * needs the Paystack payments ledger).
 */

import React, { useMemo, useState } from "react";
import { Users, Wallet, RefreshCw, AlertTriangle } from "lucide-react";
import KpiCard from "@/components/redesign/KpiCard";
import { DataTable } from "@/components/Data-Table/data-table";
import { createSubscriberColumns } from "@/components/Data-Table/columns/subscriberColumns";
import { Button } from "@/components/ui/button";
import PlanDialog from "./plan-dialog";
import { exportCsv } from "@/lib/export-csv";
import { usePagination } from "@/hooks/use-pagination";
import { cn } from "@/lib/utils";
import {
  useMarketingOverview,
  useMarketingSubscriptions,
  useMarketingSubscribers,
  useRemindSubscribers,
  TUserSubscriptionRow,
} from "@/hooks/supabase-calls/useSubscriptions";
import { TMarketingSubscriptionOutput } from "@/schemas/marketing-subscription.schema";

type SubTab = "all" | "at_risk" | "billing";

const FILTER_SELECT_CLASS =
  "h-9 px-3 rounded-xl border border-slate-200 bg-white text-[11px] font-bold uppercase tracking-widest text-slate-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all";

const PAYMENT_METHOD_OPTIONS = [
  { value: "", label: "All payment methods" },
  { value: "mtn_momo", label: "MTN MoMo" },
  { value: "vodafone_cash", label: "Vodafone Cash" },
  { value: "paystack_card", label: "Paystack Card" },
  { value: "other", label: "Other" },
];

const RENEWAL_WINDOW_OPTIONS = [
  { value: "", label: "Any renewal window" },
  { value: "7", label: "Renews in next 7 days" },
  { value: "30", label: "Renews in next 30 days" },
  { value: "90", label: "Renews in next 90 days" },
];

const cycleSuffix = (plan: TMarketingSubscriptionOutput) =>
  plan.billingCycle === "monthly"
    ? "/cycle"
    : plan.billingCycle === "yearly"
      ? "/yr"
      : " one-time";

const exportSubscriberRows = (rows: TUserSubscriptionRow[]) =>
  rows.map((row) => [
    row.user_profiles?.email ?? row.user_id,
    row.subscription_tiers?.name ?? "",
    row.status,
    row.payment_method ?? "",
    row.subscribed_at ?? "",
    row.next_renewal_at ?? row.expires_at ?? "",
    row.auto_renew ? "yes" : "no",
  ]);

const EXPORT_HEADERS = [
  "User",
  "Plan",
  "Status",
  "Payment Method",
  "Subscribed At",
  "Next Renewal",
  "Auto-Renew",
];

function PlanCard({
  plan,
  popular,
  onEdit,
}: {
  plan: TMarketingSubscriptionOutput;
  popular: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="relative bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col gap-3">
      {popular && (
        <span className="absolute -top-2 right-4 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-600 text-white shadow">
          ★ Popular
        </span>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[13px] font-black uppercase tracking-tight text-slate-800 truncate">
            {plan.name}
          </div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {plan.billingCycle}
            {!plan.isActive && " · hidden"}
          </div>
        </div>
        <Button
          aria-label={`Edit ${plan.name}`}
          title="Edit plan"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
          onClick={onEdit}
        >
          ✏️
        </Button>
      </div>

      <div className="text-2xl font-black text-slate-900">
        ₵{Number(plan.price).toFixed(0)}
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {cycleSuffix(plan)}
        </span>
      </div>

      <ul className="space-y-1.5 flex-1">
        {plan.privileges.slice(0, 6).map((feature, i) => (
          <li
            key={i}
            className="text-[11px] font-bold text-slate-600 flex items-start gap-1.5"
          >
            <span className="text-emerald-500">✓</span>
            <span>{feature}</span>
          </li>
        ))}
        {plan.privileges.length === 0 && (
          <li className="text-[11px] font-bold text-slate-400">No features listed</li>
        )}
      </ul>

      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-t border-slate-100 pt-2">
        {plan.active_subscribers ?? 0} active subscriber
        {(plan.active_subscribers ?? 0) === 1 ? "" : "s"}
      </div>
    </div>
  );
}

export default function SubscriptionsTab() {
  const [subTab, setSubTab] = useState<SubTab>("all");
  const [planFilter, setPlanFilter] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [renewalWindow, setRenewalWindow] = useState("");
  const [planDialog, setPlanDialog] = useState<{
    open: boolean;
    plan: TMarketingSubscriptionOutput | null;
  }>({ open: false, plan: null });

  const allPagination = usePagination({ key: "mkt_subs_all" });
  const riskPagination = usePagination({ key: "mkt_subs_risk" });

  const overview = useMarketingOverview();
  const plans = useMarketingSubscriptions();
  const remindAll = useRemindSubscribers();

  const renewBefore = useMemo(() => {
    if (!renewalWindow) return undefined;
    const days = Number(renewalWindow);
    return new Date(Date.now() + days * 86_400_000).toISOString();
  }, [renewalWindow]);

  const subscribers = useMarketingSubscribers({
    page: allPagination.page,
    limit: allPagination.pageSize,
    plan: planFilter || undefined,
    paymentMethod: paymentMethod || undefined,
    renewBefore,
  });

  const atRiskSubscribers = useMarketingSubscribers({
    page: riskPagination.page,
    limit: riskPagination.pageSize,
    status: "at_risk",
  });

  const allColumns = useMemo(() => createSubscriberColumns(), []);
  const riskColumns = useMemo(() => createSubscriberColumns({ atRisk: true }), []);

  const planList = plans.data?.data ?? [];
  const popularPlanId = useMemo(() => {
    const candidates = planList.filter(
      (plan) => plan.tierType !== "free" && (plan.active_subscribers ?? 0) > 0,
    );
    if (candidates.length === 0) return null;
    return candidates.reduce((best, plan) =>
      (plan.active_subscribers ?? 0) > (best.active_subscribers ?? 0) ? plan : best,
    ).id;
  }, [planList]);

  const kpis = overview.data?.subscribers;
  const subscriberRows = subscribers.data?.data ?? [];
  const atRiskRows = atRiskSubscribers.data?.data ?? [];

  const handleExport = () => {
    const rows = subTab === "at_risk" ? atRiskRows : subscriberRows;
    exportCsv(
      `subscribers-${subTab}-${new Date().toISOString().slice(0, 10)}.csv`,
      EXPORT_HEADERS,
      exportSubscriberRows(rows),
    );
  };

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      {/* ── KPI row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={<Users className="size-4" />}
          label="Premium Users"
          value={kpis?.premium_users ?? 0}
          variant="blue"
          isLoading={overview.isLoading}
          isError={overview.isError}
        />
        <KpiCard
          icon={<Wallet className="size-4" />}
          label="Monthly Recurring Revenue"
          value={`₵${(kpis?.mrr ?? 0).toLocaleString()}`}
          variant="green"
          isLoading={overview.isLoading}
          isError={overview.isError}
        />
        <KpiCard
          icon={<RefreshCw className="size-4" />}
          label="Retention Rate"
          value={`${(kpis?.retention_pct ?? 0).toFixed(1)}%`}
          variant="teal"
          isLoading={overview.isLoading}
          isError={overview.isError}
        />
        <KpiCard
          icon={<AlertTriangle className="size-4" />}
          label="At-Risk Subscribers"
          value={kpis?.at_risk ?? 0}
          variant="red"
          isLoading={overview.isLoading}
          isError={overview.isError}
        />
      </div>

      {/* ── Plan catalog ── */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-500">
          Plans ({planList.length})
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest"
          >
            📥 Export List
          </Button>
          <Button
            size="sm"
            onClick={() => setPlanDialog({ open: true, plan: null })}
            className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            + Create Plan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {plans.isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        {!plans.isLoading &&
          planList.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              popular={plan.id === popularPlanId}
              onEdit={() => setPlanDialog({ open: true, plan })}
            />
          ))}
      </div>

      {/* ── Sub-tab switcher ── */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {(
          [
            { id: "all", label: "All Subscribers" },
            { id: "at_risk", label: `⚠️ At Risk (${kpis?.at_risk ?? 0})` },
            { id: "billing", label: "💳 Billing History" },
          ] as { id: SubTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all -mb-px",
              subTab === tab.id
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-400 hover:text-slate-600",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── All Subscribers ── */}
      {subTab === "all" && (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              className={FILTER_SELECT_CLASS}
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                allPagination.onPageChange(1);
              }}
            >
              <option value="">All plans</option>
              {planList.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
            <select
              className={FILTER_SELECT_CLASS}
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                allPagination.onPageChange(1);
              }}
            >
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className={FILTER_SELECT_CLASS}
              value={renewalWindow}
              onChange={(e) => {
                setRenewalWindow(e.target.value);
                allPagination.onPageChange(1);
              }}
            >
              {RENEWAL_WINDOW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <DataTable
              columns={allColumns}
              data={subscriberRows}
              isLoading={subscribers.isLoading}
              isError={subscribers.isError}
              error={subscribers.error}
              pagination={{
                currentPage: allPagination.page,
                totalPages: subscribers.data?.meta?.totalPages || 1,
                totalItems: subscribers.data?.meta?.total || 0,
                pageSize: allPagination.pageSize,
                onPageChange: allPagination.onPageChange,
                onNextPage: allPagination.onNextPage,
                onPreviousPage: allPagination.onPreviousPage,
                canNextPage: allPagination.page < (subscribers.data?.meta?.totalPages || 1),
                canPreviousPage: allPagination.page > 1,
              }}
            />
          </div>
        </>
      )}

      {/* ── At Risk ── */}
      {subTab === "at_risk" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50/60 px-4 py-3">
            <div className="text-[11px] font-bold text-red-700">
              {atRiskSubscribers.data?.meta?.total ?? 0} subscriber(s) flagged
              at risk — payment failures or lapsing renewals. Send renewal
              reminders to win them back.
            </div>
            <Button
              size="sm"
              disabled={remindAll.isPending}
              onClick={() => remindAll.mutate({ at_risk: true })}
              className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-600 hover:bg-red-700 text-white"
            >
              {remindAll.isPending ? "Sending…" : "📨 Send All Reminders"}
            </Button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <DataTable
              columns={riskColumns}
              data={atRiskRows}
              isLoading={atRiskSubscribers.isLoading}
              isError={atRiskSubscribers.isError}
              error={atRiskSubscribers.error}
              pagination={{
                currentPage: riskPagination.page,
                totalPages: atRiskSubscribers.data?.meta?.totalPages || 1,
                totalItems: atRiskSubscribers.data?.meta?.total || 0,
                pageSize: riskPagination.pageSize,
                onPageChange: riskPagination.onPageChange,
                onNextPage: riskPagination.onNextPage,
                onPreviousPage: riskPagination.onPreviousPage,
                canNextPage:
                  riskPagination.page < (atRiskSubscribers.data?.meta?.totalPages || 1),
                canPreviousPage: riskPagination.page > 1,
              }}
            />
          </div>
        </>
      )}

      {/* ── Billing History (deferred M-D5/K-D7) ── */}
      {subTab === "billing" && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
          <div className="text-3xl mb-3">💳</div>
          <div className="text-[13px] font-black uppercase tracking-widest text-slate-700">
            Billing history coming soon
          </div>
          <p className="text-[11px] font-bold text-slate-400 mt-2 max-w-md mx-auto">
            The transaction ledger (Paid / Failed payments, month picker,
            transaction IDs) lands with the Paystack payments integration
            (M-D5 / K-D7). Subscription rows currently track status and
            renewal dates only.
          </p>
        </div>
      )}

      <PlanDialog
        open={planDialog.open}
        onOpenChange={(open) => setPlanDialog((prev) => ({ ...prev, open }))}
        plan={planDialog.plan}
      />
    </div>
  );
}
