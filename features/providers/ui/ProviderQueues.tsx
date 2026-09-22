"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Loader2, ShieldCheck, Store, Timer, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProviderQueues } from "../data/useProviderTabs";

const QUEUE_META = [
  { key: "credentialsToReview", label: "Credentials to review", icon: ShieldCheck, tab: "credentials" },
  { key: "catalogueToReview", label: "Catalogue to review", icon: Store, tab: "catalogue" },
  { key: "expiringSoon", label: "Expiring within 30 days", icon: Timer, tab: "credentials" },
] as const;

const ProviderQueues = () => {
  const { data, isLoading } = useProviderQueues();
  const [open, setOpen] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex justify-center text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const onboarding = data.onboardingRequests;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-700">
        {QUEUE_META.map(({ key, label, icon: Icon, tab }) => {
          const queue = data[key];
          const isOpen = open === key;
          return (
            <div key={key} className="p-4">
              <button
                className="w-full flex items-center justify-between gap-2 text-left"
                onClick={() => setOpen(isOpen ? null : key)}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-slate-400" />
                  <span className="text-2xs font-black uppercase tracking-widest text-slate-500">{label}</span>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              <div className="mt-2 text-2xl font-black text-slate-800 dark:text-slate-200">{queue.count}</div>
              {isOpen && (
                <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto">
                  {queue.items.length === 0 && <p className="text-3xs text-slate-400">Nothing waiting.</p>}
                  {queue.items.map((item: any) => (
                    <Link
                      key={item.id}
                      href={`/providers/${item.provider_id}?tab=${tab}`}
                      className="block rounded-lg border border-slate-100 dark:border-slate-700 px-2.5 py-1.5 text-xs hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/10 transition-colors"
                    >
                      <div className="font-bold text-slate-700 dark:text-slate-300 truncate">{item.provider_name}</div>
                      <div className="text-3xs text-slate-400 truncate">
                        {"credential_type" in item ? item.credential_type : item.name}
                        {"expires_at" in item && item.expires_at
                          ? ` · expires ${new Date(item.expires_at).toLocaleDateString()}`
                          : ""}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="p-4">
          <button
            className="w-full flex items-center justify-between gap-2 text-left"
            onClick={() => setOpen(open === "onboardingRequests" ? null : "onboardingRequests")}
          >
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-slate-400" />
              <span className="text-2xs font-black uppercase tracking-widest text-slate-500">Onboarding requests</span>
            </div>
            {open === "onboardingRequests" ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>
          <div className="mt-2 text-2xl font-black text-slate-800 dark:text-slate-200">{onboarding.count}</div>
          {open === "onboardingRequests" && (
            <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto">
              {onboarding.items.length === 0 && <p className="text-3xs text-slate-400">Nothing waiting.</p>}
              {onboarding.items.map((req) => (
                <Link
                  key={req.id}
                  href="/onboarding-requests"
                  className={cn(
                    "block rounded-lg border border-slate-100 dark:border-slate-700 px-2.5 py-1.5 text-xs",
                    "hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/10 transition-colors",
                  )}
                >
                  <div className="font-bold text-slate-700 dark:text-slate-300 truncate">{req.business_name}</div>
                  <div className="text-3xs text-slate-400 truncate">{req.first_name} {req.last_name} · {req.request_type}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderQueues;
