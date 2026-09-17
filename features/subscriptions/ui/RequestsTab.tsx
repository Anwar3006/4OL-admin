"use client";

/**
 * Pass Requests queue — extracted from the "requests" sub-tab of the old
 * features/marketing/ui/SubscriptionsTab.tsx as part of the subscriptions
 * consolidation. Calls app/api/subscriptions/requests/route.ts unchanged —
 * that route is mobile-contracted (tests/contract/mobile-contract.ts,
 * consumer hooks/use-subscription-upgrade.ts) and is not touched by this
 * move, only read from a new tab.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { useUpgradeRequests, useReviewUpgradeRequest } from "@/features/subscriptions/data/useRequests";

const PASS_TYPE_LABEL: Record<string, string> = {
  all_access: "All-Access",
  fitness_only: "Fitness only",
  plasence_only: "Plasence only",
};

export default function RequestsTab() {
  const upgradeRequests = useUpgradeRequests("pending");
  const reviewRequest = useReviewUpgradeRequest();

  return (
    <div className="w-full min-w-0 space-y-3 mt-4">
      <p className="text-xs font-bold text-slate-400">
        Mobile&apos;s &quot;Choose your pass&quot; screen has no self-serve payment yet — a
        request lands here, and fulfilling it performs the real grant (All-Access /
        Fitness-only via user_subscriptions, Plasence-only via period_premium_grants).
      </p>
      {upgradeRequests.isLoading ? (
        <div className="py-10 text-center text-xs font-bold text-slate-400">Loading…</div>
      ) : (upgradeRequests.data?.requests ?? []).length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-10 text-center">
          <div className="text-3xl mb-3">🎫</div>
          <div className="section-heading">No pending requests</div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm divide-y divide-slate-100">
          {(upgradeRequests.data?.requests ?? []).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="text-sm font-black text-slate-800 dark:text-slate-200">{r.user_name}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {r.user_email} · requested {new Date(r.requested_at).toLocaleDateString()}
                </div>
                {r.note && (
                  <div className="text-xs text-slate-400 mt-1 italic truncate max-w-md">
                    &quot;{r.note}&quot;
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
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-400"
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
  );
}
