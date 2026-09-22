"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProviderDeliveries } from "../../data/useProviderTabs";

const CHANNEL_ICON: Record<string, string> = { email: "✉️", whatsapp: "💬", sms: "📱" };

const DeliveriesTab = ({ providerId }: { providerId: string }) => {
  const { data, isLoading } = useProviderDeliveries(providerId);

  if (isLoading) {
    return <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  const rows = data?.data ?? [];
  if (rows.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
        No credential deliveries recorded
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((d) => (
        <div key={d.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span>{CHANNEL_ICON[d.channel] ?? "🔔"}</span>
              <span className="font-black text-sm text-slate-800 dark:text-slate-200 capitalize">{d.channel}</span>
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-black uppercase tracking-widest border",
                  d.status === "delivered" || d.status === "sent"
                    ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/30"
                    : d.status === "failed" || d.status === "undelivered"
                      ? "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-100 dark:border-red-500/30"
                      : "bg-slate-100 dark:bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/30",
                )}
              >
                {d.status}
              </span>
              {d.attempt > 1 && <span className="text-3xs font-bold uppercase tracking-widest text-slate-400">attempt {d.attempt}</span>}
            </div>
            <div className="mt-1 text-xs text-slate-500">{d.destination_masked}</div>
            {d.error && <div className="mt-1 text-xs text-red-600 dark:text-red-400">{d.error}</div>}
          </div>
          <div className="text-3xs font-bold uppercase tracking-widest text-slate-400 shrink-0">
            {new Date(d.created_at).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DeliveriesTab;
