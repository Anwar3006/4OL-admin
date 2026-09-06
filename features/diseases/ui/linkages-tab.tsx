"use client";

/**
 * Page Linkages tab (Gap Analysis Part I, I3/I-D6). Read-only junction
 * counts + cross-menu deep links backed by GET /api/diseases/linkages.
 * There is no linkage-edit model yet (revisit with Epic 30.1).
 */

import React from "react";
import Link from "next/link";
import { useDiseaseLinkages } from "@/features/diseases/data/useDiseasesApi";
import { cn } from "@/lib/utils";

const LINKAGE_ICONS: Record<string, string> = {
  symptoms: "🤒",
  anatomy: "🫀",
  categories: "📂",
  causes: "🧬",
  types: "🧩",
  medications: "💊",
};

const LinkagesTab = () => {
  const { data, isLoading } = useDiseaseLinkages(true);

  if (isLoading || !data) {
    return (
      <div className="card py-24 text-center text-xs font-bold text-slate-400">
        Loading linkage map…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-[11px] font-bold text-slate-500">
        🔗 Read-only linkage overview — {data.registry.conditions ?? 0} conditions
        and {data.registry.symptoms ?? 0} symptoms in the registry. Editing
        linkages happens on each condition form; a dedicated linkage editor
        is tracked under Epic 30.1.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.linkages.map((linkage) => (
          <div
            key={linkage.key}
            className="card p-5 border-slate-200 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-base">
                  {LINKAGE_ICONS[linkage.key] ?? "🔗"}
                </span>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 leading-tight">
                  {linkage.label}
                </h4>
              </div>
              <span
                className={cn(
                  "badge shrink-0",
                  linkage.status === "active" ? "badge-green" : "badge-amber",
                )}
              >
                {linkage.status === "active" ? "Active" : "In Development"}
              </span>
            </div>

            <div className="text-2xl font-black text-slate-900">
              {linkage.count === null ? "—" : linkage.count.toLocaleString()}
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                linkages
              </span>
            </div>

            <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
              {linkage.note}
            </p>

            <Link
              href={linkage.href}
              className="mt-auto inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-emerald-700 hover:text-emerald-800"
            >
              Open module →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LinkagesTab;
