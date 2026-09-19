"use client";

/**
 * Plan catalog — extracted from the plan-catalog portion of the old
 * features/marketing/ui/SubscriptionsTab.tsx as part of the subscriptions
 * consolidation. Covers all three product scopes (SUBSCRIPTION_PRODUCTS)
 * via the same scope-switcher tab-strip.
 *
 * Unlike the old Marketing tab, Delete is now wired in: the backend
 * (features/subscriptions/api/plans-detail.ts DELETE) already protects core
 * tiers and plans with active subscribers, and a real "manage plans" surface
 * should have a way to remove a plan it created by mistake, not just hide it.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import PlanDialog from "./plan-dialog";
import { usePlans, useDeletePlan } from "@/features/subscriptions/data/usePlans";
import {
  SUBSCRIPTION_PRODUCTS,
  SUBSCRIPTION_PRODUCT_LABELS,
  TMarketingSubscriptionInput,
  TMarketingSubscriptionOutput,
} from "@/features/subscriptions/schema/subscription";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const cycleSuffix = (plan: TMarketingSubscriptionOutput) =>
  plan.billingCycle === "monthly"
    ? "/cycle"
    : plan.billingCycle === "yearly"
      ? "/yr"
      : " one-time";

function PlanCard({
  plan,
  popular,
  onEdit,
  onDelete,
  deleting,
}: {
  plan: TMarketingSubscriptionOutput;
  popular: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm flex flex-col gap-3">
      {popular && (
        <span className="absolute -top-2 right-4 inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-black uppercase tracking-widest bg-emerald-600 text-white shadow">
          ★ Popular
        </span>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-slate-200 truncate">
            {plan.name}
          </div>
          <div className="text-2xs text-slate-400 font-bold uppercase tracking-widest">
            {plan.billingCycle}
            {!plan.isActive && " · hidden"}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            aria-label={`Edit ${plan.name}`}
            title="Edit plan"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/15"
            onClick={onEdit}
          >
            ✏️
          </Button>
          <Button
            aria-label={`Delete ${plan.name}`}
            title="Delete plan"
            variant="ghost"
            size="icon"
            disabled={deleting}
            className="h-8 w-8 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15"
            onClick={onDelete}
          >
            🗑️
          </Button>
        </div>
      </div>

      <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
        {formatCurrency(plan.price, { decimals: 0 })}
        <span className="text-2xs font-bold text-slate-400 uppercase tracking-widest">
          {cycleSuffix(plan)}
        </span>
      </div>

      <ul className="space-y-1.5 flex-1">
        {plan.privileges.slice(0, 6).map((feature, i) => (
          <li
            key={i}
            className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-start gap-1.5"
          >
            <span className="text-emerald-500">✓</span>
            <span>{feature}</span>
          </li>
        ))}
        {plan.privileges.length === 0 && (
          <li className="text-xs font-bold text-slate-400">No features listed</li>
        )}
      </ul>

      <div className="text-2xs font-black uppercase tracking-widest text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
        {plan.active_subscribers ?? 0} active subscriber
        {(plan.active_subscribers ?? 0) === 1 ? "" : "s"}
      </div>
    </div>
  );
}

export default function PlansTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [productScope, setProductScope] =
    useState<TMarketingSubscriptionInput["tierType"]>("full_access");
  const [planDialog, setPlanDialog] = useState<{
    open: boolean;
    plan: TMarketingSubscriptionOutput | null;
  }>({ open: false, plan: null });

  // Deep-link support for the Dashboard's "New Plan" quick action
  // (?tab=plans&create=1) — opens the same Create Plan dialog below, once,
  // then drops the param so navigating back here doesn't reopen it.
  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setPlanDialog({ open: true, plan: null });
      router.replace("/subscriptions?tab=plans", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plans = usePlans();
  const deletePlan = useDeletePlan();

  const planList = useMemo(() => plans.data?.data ?? [], [plans.data?.data]);
  const visiblePlans = useMemo(
    () => planList.filter((plan) => plan.tierType === productScope),
    [planList, productScope],
  );
  const popularPlanId = useMemo(() => {
    const candidates = visiblePlans.filter((plan) => (plan.active_subscribers ?? 0) > 0);
    if (candidates.length === 0) return null;
    return candidates.reduce((best, plan) =>
      (plan.active_subscribers ?? 0) > (best.active_subscribers ?? 0) ? plan : best,
    ).id;
  }, [visiblePlans]);

  const handleDelete = (plan: TMarketingSubscriptionOutput) => {
    if (!window.confirm(`Delete the "${plan.name}" plan? This cannot be undone.`)) return;
    deletePlan.mutate(plan.id);
  };

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Subscription product">
        {SUBSCRIPTION_PRODUCTS.map((product) => (
          <button
            key={product}
            type="button"
            role="tab"
            aria-selected={productScope === product}
            onClick={() => setProductScope(product)}
            className={cn(
              "btn btn-sm",
              productScope === product ? "btn-primary" : "btn-secondary",
            )}
          >
            {SUBSCRIPTION_PRODUCT_LABELS[product]}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
          {SUBSCRIPTION_PRODUCT_LABELS[productScope]} plans ({visiblePlans.length})
        </h3>
        <Button
          size="sm"
          onClick={() => setPlanDialog({ open: true, plan: null })}
          className="h-9 px-4 rounded-xl text-2xs font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          + Create Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {plans.isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        {!plans.isLoading &&
          visiblePlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              popular={plan.id === popularPlanId}
              onEdit={() => setPlanDialog({ open: true, plan })}
              onDelete={() => handleDelete(plan)}
              deleting={deletePlan.isPending && deletePlan.variables === plan.id}
            />
          ))}
        {!plans.isLoading && visiblePlans.length === 0 && (
          <div className="sm:col-span-2 xl:col-span-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 text-center text-xs font-bold text-slate-400">
            No {SUBSCRIPTION_PRODUCT_LABELS[productScope]} plans yet. Create the first one above.
          </div>
        )}
      </div>

      <PlanDialog
        open={planDialog.open}
        onOpenChange={(open) => setPlanDialog((prev) => ({ ...prev, open }))}
        plan={planDialog.plan}
        defaultTierType={productScope}
      />
    </div>
  );
}
