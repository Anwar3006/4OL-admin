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
import { createSubscriberColumns } from "./subscriberColumns";
import { Button } from "@/components/ui/button";
import PlanDialog from "./plan-dialog";
import { downloadCsv } from "@/lib/csv";
import { usePagination } from "@/hooks/use-pagination";
import { cn } from "@/lib/utils";
import {
  useMarketingOverview,
  useMarketingSubscriptions,
  useMarketingSubscribers,
  useRemindSubscribers,
  useUpgradeRequests,
  useReviewUpgradeRequest,
  TUserSubscriptionRow,
} from "@/features/marketing/data/useSubscriptions";
import { TMarketingSubscriptionOutput } from "@/features/marketing/schema/subscription";
import { formatCurrency } from "@/lib/format";

type SubTab = "all" | "at_risk" | "billing" | "requests";

const PASS_TYPE_LABEL: Record<string, string> = {
  all_access: "All-Access",
  fitness_only: "Fitness only",
  plasence_only: "Plasence only",
};

const FILTER_SELECT_CLASS =
  "h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold uppercase tracking-widest text-slate-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all";

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

// Labels and values in one place. They used to be two lists — a headers array
// and a positional row mapper eleven lines apart — which stay correct only as
// long as nobody inserts a column into one and not the other.
const exportSubscriberRows = (rows: TUserSubscriptionRow[]) =>
  rows.map((row) => ({
    User: row.user_profiles?.email ?? row.user_id,
    Plan: row.subscription_tiers?.name ?? "",
    Status: row.status,
    "Payment Method": row.payment_method ?? "",
    "Subscribed At": row.subscribed_at ?? "",
    "Next Renewal": row.next_renewal_at ?? row.expires_at ?? "",
    "Auto-Renew": row.auto_renew ? "yes" : "no",
  }));

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
        <span className="absolute -top-2 right-4 inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-black uppercase tracking-widest bg-emerald-600 text-white shadow">
          ★ Popular
        </span>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-black uppercase tracking-tight text-slate-800 truncate">
            {plan.name}
          </div>
          <div className="text-2xs text-slate-400 font-bold uppercase tracking-widest">
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
        {formatCurrency(plan.price, { decimals: 0 })}
        <span className="text-2xs font-bold text-slate-400 uppercase tracking-widest">
          {cycleSuffix(plan)}
        </span>
      </div>

      <ul className="space-y-1.5 flex-1">
        {plan.privileges.slice(0, 6).map((feature, i) => (
          <li
            key={i}
            className="text-xs font-bold text-slate-600 flex items-start gap-1.5"
          >
            <span className="text-emerald-500">✓</span>
            <span>{feature}</span>
          </li>
        ))}
        {plan.privileges.length === 0 && (
          <li className="text-xs font-bold text-slate-400">No features listed</li>
        )}
      </ul>

      <div className="text-2xs font-black uppercase tracking-widest text-slate-400 border-t border-slate-100 pt-2">
        {plan.active_subscribers ?? 0} active subscriber
        {(plan.active_subscribers ?? 0) === 1 ? "" : "s"}
      </div>
    </div>
  );
}

export default function SubscriptionsTab() {
  const [subTab, setSubTab] = useState<SubTab>("all");
  const upgradeRequests = useUpgradeRequests("pending");
  const reviewRequest = useReviewUpgradeRequest();
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
    downloadCsv(exportSubscriberRows(rows), `subscribers-${subTab}`);
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
          value={formatCurrency(kpis?.mrr ?? 0)}
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
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
          Plans ({planList.length})
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-9 px-4 rounded-xl text-2xs font-black uppercase tracking-widest"
          >
            📥 Export List
          </Button>
          <Button
            size="sm"
            onClick={() => setPlanDialog({ open: true, plan: null })}
            className="h-9 px-4 rounded-xl text-2xs font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white"
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
            { id: "requests", label: `🎫 Pass Requests (${upgradeRequests.data?.total ?? 0})` },
            { id: "billing", label: "💳 Billing History" },
          ] as { id: SubTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-xs font-black uppercase tracking-widest border-b-2 transition-all -mb-px",
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
            <div className="text-xs font-bold text-red-700">
              {atRiskSubscribers.data?.meta?.total ?? 0} subscriber(s) flagged
              at risk — payment failures or lapsing renewals. Send renewal
              reminders to win them back.
            </div>
            <Button
              size="sm"
              disabled={remindAll.isPending}
              onClick={() => remindAll.mutate({ at_risk: true })}
              className="h-9 px-4 rounded-xl text-2xs font-black uppercase tracking-widest bg-red-600 hover:bg-red-700 text-white"
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
      {/* ── Pass Requests (three scoped passes gap-closure) ── */}
      {subTab === "requests" && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400">
            Mobile's "Choose your pass" screen has no self-serve payment yet — a request lands
            here, and fulfilling it performs the real grant (All-Access / Fitness-only via
            user_subscriptions, Plasence-only via period_premium_grants).
          </p>
          {upgradeRequests.isLoading ? (
            <div className="py-10 text-center text-xs font-bold text-slate-400">Loading…</div>
          ) : (upgradeRequests.data?.requests ?? []).length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
              <div className="text-3xl mb-3">🎫</div>
              <div className="section-heading">
                No pending requests
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100">
              {(upgradeRequests.data?.requests ?? []).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-800">{r.user_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {r.user_email} · requested {new Date(r.requested_at).toLocaleDateString()}
                    </div>
                    {r.note && (
                      <div className="text-xs text-slate-400 mt-1 italic truncate max-w-md">
                        "{r.note}"
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="badge badge-blue h-5 text-3xs uppercase font-black">
                      {PASS_TYPE_LABEL[r.pass_type] ?? r.pass_type}
                    </span>
                    <span className="badge badge-slate h-5 text-3xs uppercase font-black font-mono">
                      {r.tier_key}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={reviewRequest.isPending}
                      onClick={() => reviewRequest.mutate({ requestId: r.id, action: "fulfill" })}
                    >
                      Fulfil
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={reviewRequest.isPending}
                      className="text-red-600 hover:text-red-700"
                      onClick={() => {
                        const reason = window.prompt("Reason for declining this request:");
                        if (!reason?.trim()) return;
                        reviewRequest.mutate({ requestId: r.id, action: "decline", reason });
                      }}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === "billing" && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
          <div className="text-3xl mb-3">💳</div>
          <div className="section-heading">
            Billing history coming soon
          </div>
          <p className="text-xs font-bold text-slate-400 mt-2 max-w-md mx-auto">
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
