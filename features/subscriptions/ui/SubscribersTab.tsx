"use client";

/**
 * Subscribers & Entitlements — the union of every way a user gets premium
 * access, consolidated from two source files as part of the subscriptions
 * migration:
 *
 *  - "All Subscribers" / "At Risk" / "Billing History", the payment-lifecycle
 *    view (auto-renew, risk reason, renewal reminders, cancel) over
 *    user_subscriptions, moved from features/marketing/ui/SubscriptionsTab.tsx.
 *    Backed by /api/subscriptions/subscribers (moved from
 *    /api/marketing/subscribers, same handler, same shape).
 *
 *  - Grant/Revoke + Bulk Grant + the Entitlements table, moved verbatim from
 *    features/fitness/ui/SubscriptionsTab.tsx. Entitlements is the OTHER
 *    half of the union: it already merges user_subscriptions with
 *    period_premium_grants (scope=period_only, no auto_renew/reminder —
 *    those actions genuinely don't apply to period grants, so this view
 *    doesn't fake them) via app/api/subscriptions/admin, which is UNCHANGED
 *    by this migration (see features/subscriptions/README.md for why this
 *    tab composes two endpoints instead of extending that one).
 *
 * Grant/revoke stays SUPER ADMIN only, enforced server-side in
 * app/api/subscriptions/admin/route.ts exactly as before — this migration
 * does not loosen that gate.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/Data-Table/data-table";
import { UserSearchSelect } from "@/components/UserSearchSelect";
import { downloadCsv } from "@/lib/csv";
import { usePagination } from "@/hooks/use-pagination";
import { cn } from "@/lib/utils";
import { usePermissionContext } from "@/stores/permission-context";
import { createSubscriberColumns } from "./subscriberColumns";
import {
  useSubscribers,
  useRemindSubscribers,
  TUserSubscriptionRow,
} from "@/features/subscriptions/data/useSubscribers";
import { usePlans } from "@/features/subscriptions/data/usePlans";

type SubTab = "all" | "at_risk" | "billing";

type EntitlementRow = {
  id: string;
  user_id: string;
  user_name: string;
  status: "active" | "expired" | "revoked";
  source: string;
  scope: "all_access" | "fitness_only" | "period_only";
  record_type: "subscription" | "period_grant";
  granted_by_name: string | null;
  starts_at: string;
  expires_at: string | null;
  note: string | null;
  subscription_tiers?: { key: string; name: string } | null;
};

const SCOPE_LABELS: Record<"all_access" | "fitness_only" | "period_only", string> = {
  all_access: "Entire app",
  fitness_only: "Fitness only",
  period_only: "Period Tracker only",
};

// Entire app / Fitness: free-form up to 3650 days server-side, these are
// just convenient presets (Custom reveals a number input).
const GENERAL_DURATION_OPTIONS = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days (~3 months)" },
  { value: "365", label: "365 days" },
] as const;

// Period Tracker: hard-capped at exactly these values -- a Postgres CHECK
// constraint and a Zod schema both enforce it (grant-logic.ts), so this list
// mirrors the server-side truth rather than inventing a new rule.
const PERIOD_DURATION_OPTIONS = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days (~3 months)" },
] as const;

const FILTER_SELECT_CLASS =
  "h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all";

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

const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString() : "Lifetime");

const statusBadge: Record<string, string> = {
  active: "badge-green",
  expired: "badge-slate",
  revoked: "badge-red",
};

// Labels and values in one place, not a headers array plus a positional row
// mapper eleven lines apart — those stay correct only as long as nobody
// inserts a column into one and not the other.
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

export default function SubscribersTab() {
  const { userRole } = usePermissionContext();
  const isSuperAdmin = userRole === "super_admin";

  // ── "All Subscribers" / "At Risk" (user_subscriptions, marketing-lifecycle) ──
  const [subTab, setSubTab] = useState<SubTab>("all");
  const [planFilter, setPlanFilter] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [renewalWindow, setRenewalWindow] = useState("");

  const allPagination = usePagination({ key: "sub_subs_all" });
  const riskPagination = usePagination({ key: "sub_subs_risk" });

  const plans = usePlans();
  const remindAll = useRemindSubscribers();

  const renewBefore = useMemo(() => {
    if (!renewalWindow) return undefined;
    const days = Number(renewalWindow);
    return new Date(Date.now() + days * 86_400_000).toISOString();
  }, [renewalWindow]);

  const subscribers = useSubscribers({
    page: allPagination.page,
    limit: allPagination.pageSize,
    plan: planFilter || undefined,
    paymentMethod: paymentMethod || undefined,
    renewBefore,
  });

  const atRiskSubscribers = useSubscribers({
    page: riskPagination.page,
    limit: riskPagination.pageSize,
    status: "at_risk",
  });

  const allColumns = useMemo(() => createSubscriberColumns(), []);
  const riskColumns = useMemo(() => createSubscriberColumns({ atRisk: true }), []);
  const planList = useMemo(() => plans.data?.data ?? [], [plans.data?.data]);
  const subscriberRows = subscribers.data?.data ?? [];
  const atRiskRows = atRiskSubscribers.data?.data ?? [];

  const handleExport = () => {
    const rows = subTab === "at_risk" ? atRiskRows : subscriberRows;
    downloadCsv(exportSubscriberRows(rows), `subscribers-${subTab}`);
  };

  // ── Entitlements (user_subscriptions UNION period_premium_grants) ──────
  const [rows, setRows] = useState<EntitlementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/subscriptions/admin?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load entitlements");
      setRows(json.subscriptions ?? []);
      setTotal(json.total ?? 0);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [offset, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Grant form state ────────────────────────────────────────
  const [grantUser, setGrantUser] = useState("");
  const [grantScope, setGrantScope] = useState<"all_access" | "fitness_only" | "period_only">("all_access");
  const [grantTier, setGrantTier] = useState<"premium" | "lifetime">("premium");
  const [grantDuration, setGrantDuration] = useState("30");
  const [grantCustomDays, setGrantCustomDays] = useState("");
  const [grantNote, setGrantNote] = useState("");
  const [granting, setGranting] = useState(false);

  const grantDurationOptions =
    grantScope === "period_only"
      ? PERIOD_DURATION_OPTIONS
      : [...GENERAL_DURATION_OPTIONS, { value: "custom", label: "Custom…" }];

  const handleGrant = async () => {
    if (!grantUser) {
      toast.error("Select a user first");
      return;
    }
    if (grantScope === "period_only" && !grantNote.trim()) {
      toast.error("A reason is required for Period Tracker grants");
      return;
    }
    const durationDays =
      grantDuration === "custom" ? Number(grantCustomDays) : Number(grantDuration);
    setGranting(true);
    try {
      const body: Record<string, unknown> = {
        userId: grantUser,
        tierKey: grantScope === "period_only" ? "premium" : grantTier,
        scope: grantScope,
      };
      if (grantScope === "period_only" || grantTier === "premium") {
        if (!durationDays) {
          toast.error("Enter a duration");
          setGranting(false);
          return;
        }
        body.durationDays = durationDays;
      }
      if (grantNote.trim()) {
        body.note = grantNote.trim();
        body.reason = grantNote.trim();
      }
      const res = await fetch("/api/subscriptions/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Grant failed");
      toast.success(
        `${grantScope === "period_only" ? "Period Tracker Cycle Pro" : grantTier === "lifetime" ? "Lifetime premium" : "Premium"} assigned (${SCOPE_LABELS[grantScope]})`,
      );
      setGrantUser("");
      setGrantDuration("30");
      setGrantCustomDays("");
      setGrantNote("");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (row: EntitlementRow) => {
    if (!confirm(`Revoke ${row.subscription_tiers?.name ?? "premium"} access for ${row.user_name}?`)) return;
    try {
      const res = await fetch("/api/subscriptions/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: row.id, recordType: row.record_type }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Revoke failed");
      toast.success("Subscription revoked");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  // ── Bulk grant state ────────────────────────────────────────
  const [bulkMode, setBulkMode] = useState<"selected" | "all_active">("selected");
  const [bulkPickUser, setBulkPickUser] = useState("");
  const [bulkTargets, setBulkTargets] = useState<string[]>([]);
  const [bulkScope, setBulkScope] = useState<"all_access" | "fitness_only" | "period_only">("all_access");
  const [bulkTier, setBulkTier] = useState<"premium" | "lifetime">("premium");
  const [bulkDuration, setBulkDuration] = useState("30");
  const [bulkCustomDays, setBulkCustomDays] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkAllActiveCount, setBulkAllActiveCount] = useState<number | null>(null);
  const [bulkAllActiveSample, setBulkAllActiveSample] = useState<string[]>([]);
  const [bulkConfirmText, setBulkConfirmText] = useState("");
  const [previewingAll, setPreviewingAll] = useState(false);
  const [bulkGranting, setBulkGranting] = useState(false);

  const bulkDurationOptions =
    bulkScope === "period_only"
      ? PERIOD_DURATION_OPTIONS
      : [...GENERAL_DURATION_OPTIONS, { value: "custom", label: "Custom…" }];

  const previewAllActive = async () => {
    setPreviewingAll(true);
    setBulkAllActiveCount(null);
    try {
      const res = await fetch("/api/subscriptions/admin/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targets: { mode: "all_active" },
          scope: bulkScope,
          durationDays: 1,
          reason: "preview",
          preview: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Preview failed");
      setBulkAllActiveCount(json.count);
      setBulkAllActiveSample(json.sample ?? []);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPreviewingAll(false);
    }
  };

  const bulkTargetCount = bulkMode === "selected" ? bulkTargets.length : (bulkAllActiveCount ?? 0);
  const bulkCanSubmit =
    bulkReason.trim().length >= 4 &&
    (bulkMode === "selected"
      ? bulkTargets.length > 0
      : bulkAllActiveCount !== null && bulkConfirmText.trim() === "GRANT ALL");

  const handleBulkGrant = async () => {
    const durationDays = bulkDuration === "custom" ? Number(bulkCustomDays) : Number(bulkDuration);
    if (!durationDays) {
      toast.error("Enter a duration");
      return;
    }
    setBulkGranting(true);
    try {
      const res = await fetch("/api/subscriptions/admin/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targets:
            bulkMode === "selected"
              ? { mode: "selected", userIds: bulkTargets }
              : { mode: "all_active" },
          scope: bulkScope,
          tierKey: bulkTier,
          durationDays,
          reason: bulkReason.trim(),
          preview: false,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Bulk grant failed");
      const failedCount = (json.failed ?? []).length;
      if (failedCount > 0) {
        toast.error(`Granted ${json.granted}, ${failedCount} failed — see console for details`);
        console.warn("Bulk grant failures", json.failed);
      } else {
        toast.success(`Granted ${SCOPE_LABELS[bulkScope]} to ${json.granted} user(s)`);
      }
      setBulkTargets([]);
      setBulkAllActiveCount(null);
      setBulkAllActiveSample([]);
      setBulkConfirmText("");
      setBulkReason("");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBulkGranting(false);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      {/* ── Sub-tab switcher ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
        {(
          [
            { id: "all", label: "All Subscribers" },
            { id: "at_risk", label: `⚠️ At Risk (${atRiskSubscribers.data?.meta?.total ?? 0})` },
            { id: "billing", label: "💳 Billing History" },
          ] as { id: SubTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-xs font-black uppercase tracking-widest border-b-2 transition-all -mb-px",
              subTab === tab.id
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── All Subscribers ── */}
      {subTab === "all" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="h-9 px-4 rounded-xl text-2xs font-black uppercase tracking-widest"
            >
              📥 Export List
            </Button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-100 dark:border-red-500/30 bg-red-50/60 dark:bg-red-500/15/60 px-4 py-3">
            <div className="text-xs font-bold text-red-700 dark:text-red-400">
              {atRiskSubscribers.data?.meta?.total ?? 0} subscriber(s) flagged at risk —
              payment failures or lapsing renewals. Send renewal reminders to win them back.
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

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
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
                canNextPage: riskPagination.page < (atRiskSubscribers.data?.meta?.totalPages || 1),
                canPreviousPage: riskPagination.page > 1,
              }}
            />
          </div>
        </>
      )}

      {/* ── Billing History (deferred — needs the Paystack payments ledger) ── */}
      {subTab === "billing" && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-10 text-center">
          <div className="text-3xl mb-3">💳</div>
          <div className="section-heading">Billing history coming soon</div>
          <p className="text-xs font-bold text-slate-400 mt-2 max-w-md mx-auto">
            The transaction ledger (Paid / Failed payments, month picker, transaction IDs)
            lands with the Paystack payments integration. Subscription rows currently track
            status and renewal dates only.
          </p>
        </div>
      )}

      {/* ── Grant panel (super admin only) ── */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-6">
        {isSuperAdmin ? (
          <div className="card bg-white dark:bg-slate-800">
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-1">💳 Assign Premium Access</h3>
            <p className="text-sm text-slate-500 font-medium mb-4">
              Super-admin only. Grants are recorded with your admin id and the user is
              notified in-app. Paystack purchases will appear here automatically once
              payment collection is enabled.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">User</label>
                <UserSearchSelect value={grantUser} onValueChange={setGrantUser} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Scope</label>
                <select
                  className="w-full h-10 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                  value={grantScope}
                  onChange={(e) => {
                    const next = e.target.value as typeof grantScope;
                    setGrantScope(next);
                    setGrantDuration(next === "fitness_only" || next === "period_only" ? "30" : grantDuration);
                  }}
                >
                  <option value="all_access">Entire app</option>
                  <option value="fitness_only">Fitness only</option>
                  <option value="period_only">Period Tracker only</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tier</label>
                <select
                  className="w-full h-10 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                  value={grantScope === "period_only" ? "premium" : grantTier}
                  disabled={grantScope === "period_only"}
                  onChange={(e) => setGrantTier(e.target.value as "premium" | "lifetime")}
                >
                  {grantScope === "period_only" ? (
                    <option value="premium">Cycle Pro</option>
                  ) : (
                    <>
                      <option value="premium">Premium</option>
                      <option value="lifetime">Lifetime Premium</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                  Duration {grantTier === "lifetime" && grantScope !== "period_only" ? "(n/a)" : ""}
                </label>
                {grantDuration === "custom" ? (
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    autoFocus
                    placeholder="Days"
                    className="w-full h-10 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl"
                    value={grantCustomDays}
                    onChange={(e) => setGrantCustomDays(e.target.value)}
                  />
                ) : (
                  <select
                    className="w-full h-10 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                    value={grantDuration}
                    disabled={grantTier === "lifetime" && grantScope !== "period_only"}
                    onChange={(e) => setGrantDuration(e.target.value)}
                  >
                    {grantDurationOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}
              </div>
              <Button
                onClick={handleGrant}
                disabled={granting}
                className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {granting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign
              </Button>
            </div>
            <input
              placeholder={
                grantScope === "period_only"
                  ? "Reason (required for Period Tracker grants, stored for audit)"
                  : "Note (optional, stored with the grant for audit)"
              }
              className="w-full mt-3 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl"
              value={grantNote}
              onChange={(e) => setGrantNote(e.target.value)}
            />
          </div>
        ) : (
          <div className="alert bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 p-3 rounded-lg text-sm font-medium">
            Assigning or revoking premium access is restricted to the super admin. You can
            still review entitlements below.
          </div>
        )}

        {/* ── Bulk grant panel (super admin only) ── */}
        {isSuperAdmin && (
          <div className="card bg-white dark:bg-slate-800">
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-1">👥 Bulk Grant Premium</h3>
            <p className="text-sm text-slate-500 font-medium mb-4">
              Grant free premium access to many users at once — a picked list, or every
              active user. Each grant is independent (one failure never blocks the rest)
              and this is logged as a single audit entry.
            </p>

            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setBulkMode("selected")}
                className={`h-9 px-4 rounded-xl text-sm font-bold border ${
                  bulkMode === "selected"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                }`}
              >
                Selected users
              </button>
              <button
                type="button"
                onClick={() => setBulkMode("all_active")}
                className={`h-9 px-4 rounded-xl text-sm font-bold border ${
                  bulkMode === "all_active"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                }`}
              >
                All active users
              </button>
            </div>

            {bulkMode === "selected" ? (
              <div className="space-y-3 mb-4">
                <UserSearchSelect
                  value={bulkPickUser}
                  onValueChange={setBulkPickUser}
                  placeholder="Add a user…"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!bulkPickUser || bulkTargets.includes(bulkPickUser)}
                  onClick={() => {
                    setBulkTargets((prev) => [...prev, bulkPickUser]);
                    setBulkPickUser("");
                  }}
                >
                  + Add user
                </Button>
                {bulkTargets.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {bulkTargets.map((id) => (
                      <span key={id} className="badge badge-slate text-3xs font-bold">
                        {id.slice(0, 8)}…
                        <button
                          type="button"
                          className="ml-1 text-red-500 font-black"
                          onClick={() => setBulkTargets((prev) => prev.filter((x) => x !== id))}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                <Button variant="outline" size="sm" disabled={previewingAll} onClick={previewAllActive}>
                  {previewingAll && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Preview audience
                </Button>
                {bulkAllActiveCount !== null && (
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    This will grant {bulkAllActiveCount} active user{bulkAllActiveCount === 1 ? "" : "s"}
                    {bulkAllActiveSample.length > 0 && (
                      <span className="font-normal text-slate-500"> — e.g. {bulkAllActiveSample.join(", ")}</span>
                    )}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mb-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Scope</label>
                <select
                  className="w-full h-10 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                  value={bulkScope}
                  onChange={(e) => {
                    const next = e.target.value as typeof bulkScope;
                    setBulkScope(next);
                    setBulkDuration("30");
                  }}
                >
                  <option value="all_access">Entire app</option>
                  <option value="fitness_only">Fitness only</option>
                  <option value="period_only">Period Tracker only</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tier</label>
                <select
                  className="w-full h-10 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                  value={bulkScope === "period_only" ? "premium" : bulkTier}
                  disabled={bulkScope === "period_only"}
                  onChange={(e) => setBulkTier(e.target.value as "premium" | "lifetime")}
                >
                  {bulkScope === "period_only" ? (
                    <option value="premium">Cycle Pro</option>
                  ) : (
                    <>
                      <option value="premium">Premium</option>
                      <option value="lifetime">Lifetime Premium</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Duration</label>
                {bulkDuration === "custom" ? (
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    autoFocus
                    placeholder="Days"
                    className="w-full h-10 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl"
                    value={bulkCustomDays}
                    onChange={(e) => setBulkCustomDays(e.target.value)}
                  />
                ) : (
                  <select
                    className="w-full h-10 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                    value={bulkDuration}
                    onChange={(e) => setBulkDuration(e.target.value)}
                  >
                    {bulkDurationOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}
              </div>
              {bulkMode === "all_active" && bulkAllActiveCount !== null && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Type GRANT ALL to confirm
                  </label>
                  <input
                    className="w-full h-10 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl"
                    value={bulkConfirmText}
                    onChange={(e) => setBulkConfirmText(e.target.value)}
                    placeholder="GRANT ALL"
                  />
                </div>
              )}
            </div>

            <input
              placeholder="Reason (required, stored with the grant for audit)"
              className="w-full mb-3 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl"
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
            />

            <Button
              onClick={handleBulkGrant}
              disabled={!bulkCanSubmit || bulkGranting}
              className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
            >
              {bulkGranting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Grant to {bulkTargetCount || "…"} user{bulkTargetCount === 1 ? "" : "s"}
            </Button>
          </div>
        )}

        {/* ── Entitlements table: every scope, incl. period_premium_grants ── */}
        <div className="card bg-white dark:bg-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-200">🧾 Entitlements</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">
                {total.toLocaleString()} entitlement record(s) — every scope, including
                Period Tracker passes that never appear in the tables above.
              </p>
            </div>
            <select
              className="h-9 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setOffset(0);
              }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600 dark:text-emerald-400" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-400 font-medium py-8 text-center">
              No entitlements match this filter yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-2xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">Tier</th>
                    <th className="py-2 pr-4">Service</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Source</th>
                    <th className="py-2 pr-4">Starts</th>
                    <th className="py-2 pr-4">Expires</th>
                    <th className="py-2 pr-4">Granted by</th>
                    {isSuperAdmin && <th className="py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <td className="py-3 pr-4 text-sm font-bold text-slate-800 dark:text-slate-200">{row.user_name}</td>
                      <td className="py-3 pr-4">
                        <span className="badge badge-blue h-5 text-3xs uppercase font-black">
                          {row.subscription_tiers?.name ?? "—"}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="badge badge-purple h-5 text-3xs uppercase font-black">
                          {row.scope === "fitness_only" ? "Fitness" : row.scope === "period_only" ? "Plasence" : "Entire app"}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`badge h-5 text-3xs uppercase font-black ${statusBadge[row.status] ?? "badge-slate"}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs font-semibold text-slate-600 dark:text-slate-300">{row.source}</td>
                      <td className="py-3 pr-4 text-xs text-slate-600 dark:text-slate-300">{fmtDate(row.starts_at)}</td>
                      <td className="py-3 pr-4 text-xs text-slate-600 dark:text-slate-300">{fmtDate(row.expires_at)}</td>
                      <td className="py-3 pr-4 text-xs text-slate-600 dark:text-slate-300">{row.granted_by_name ?? "—"}</td>
                      {isSuperAdmin && (
                        <td className="py-3 text-right">
                          {row.status === "active" && (
                            <button
                              onClick={() => handleRevoke(row)}
                              className="text-2xs font-black uppercase text-red-500 hover:text-red-700 dark:hover:text-red-400"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {total > limit && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs font-bold text-slate-400">
                {offset + 1}–{Math.min(offset + limit, total)} of {total}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>
                  Prev
                </Button>
                <Button variant="outline" size="sm" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
