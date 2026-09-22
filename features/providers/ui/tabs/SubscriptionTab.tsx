"use client";

import React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useProviderSubscription } from "../../data/useProviderTabs";

const SubscriptionTab = ({ providerId }: { providerId: string }) => {
  const { data, isLoading } = useProviderSubscription(providerId);

  if (isLoading) {
    return <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  const rows = data?.data ?? [];

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Read-only here — grants, checkout and plan changes go through{" "}
        <Link href="/subscriptions" className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline">
          Subscriptions
        </Link>
        .
      </p>
      {rows.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
          No subscription on record — free listing
        </div>
      ) : (
        rows.map((s) => (
          <div key={s.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-sm text-slate-800 dark:text-slate-200">{s.subscription_name ?? "Unknown plan"}</span>
              <span className="badge badge-indigo capitalize">{s.status}</span>
              {s.auto_renew && <span className="badge badge-green">Auto-renews</span>}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {s.billing_cycle} · started {new Date(s.started_at).toLocaleDateString()}
              {s.current_period_end && ` · renews ${new Date(s.current_period_end).toLocaleDateString()}`}
              {s.cancelled_at && ` · cancelled ${new Date(s.cancelled_at).toLocaleDateString()}`}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default SubscriptionTab;
