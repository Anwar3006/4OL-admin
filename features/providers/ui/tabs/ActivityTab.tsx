"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { useProviderActivity } from "../../data/useProviderTabs";

const ACTOR_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin", system: "System" };

const ActivityTab = ({ providerId }: { providerId: string }) => {
  const { data, isLoading } = useProviderActivity(providerId);

  if (isLoading) {
    return <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  const rows = data?.data ?? [];
  if (rows.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
        No activity recorded yet
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
      {rows.map((a) => (
        <div key={a.id} className="p-4 flex items-center justify-between gap-3">
          <div>
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{a.action.replace(/_/g, " ")}</span>
            <div className="mt-0.5 text-3xs font-bold uppercase tracking-widest text-slate-400">
              {ACTOR_LABEL[a.actor_kind] ?? a.actor_kind}
              {a.device_id && ` · device ${a.device_id.slice(0, 8)}`}
            </div>
          </div>
          <div className="text-3xs font-bold uppercase tracking-widest text-slate-400 shrink-0">
            {new Date(a.created_at).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityTab;
