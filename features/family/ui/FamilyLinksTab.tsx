"use client";

import React from "react";
import { format } from "date-fns";
import { useFamilyLinks } from "../data/useFamily";
import { cn } from "@/lib/utils";

// AF-01 — Family Links tab: active caregiver ↔ dependent pairs, both dependent
// kinds, status, live scopes, and dependent count vs tier limit.

const STATUS_STYLE: Record<string, string> = {
  invited: "bg-sky-50 text-sky-600 border-sky-200",
  active: "bg-emerald-50 text-emerald-600 border-emerald-200",
  paused: "bg-amber-50 text-amber-600 border-amber-200",
  revoked: "bg-rose-50 text-rose-600 border-rose-200",
};

export default function FamilyLinksTab() {
  const { data, isLoading, isError, error } = useFamilyLinks();
  const links = data ?? [];

  if (isError) {
    return (
      <div className="p-10 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 mt-4">
        <div className="text-3xl mb-3">👪</div>
        <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-2">
          Family Circle unavailable
        </p>
        <p className="text-xs font-medium text-slate-400 max-w-md mx-auto">
          Apply{" "}
          <code className="font-mono">
            20260926100000_af01_dependents_family_circle.sql
          </code>{" "}
          to the live database to activate this tab.
        </p>
        <p className="text-2xs font-bold text-rose-400 mt-3">
          {(error as Error)?.message}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-10 text-center text-xs font-bold text-slate-400 uppercase tracking-widest mt-4">
        Loading…
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 mt-4 overflow-x-auto bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            {["Dependent", "Kind", "Relationship", "Status", "Live Scopes", "Circle Load", "Created"].map(
              (h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-3xs font-black uppercase tracking-widest text-slate-400"
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {links.map((l) => (
            <tr
              key={l.id}
              className="border-b border-slate-100 dark:border-slate-700/60 last:border-0"
            >
              <td className="px-4 py-3">
                <div className="text-xs font-black text-slate-800 dark:text-slate-100">
                  {l.display_name}
                </div>
                <div className="text-3xs text-slate-400 font-mono">
                  {l.id.slice(0, 8)}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-3xs font-black uppercase tracking-widest text-slate-500">
                  {l.is_profile_only ? "🧓 Profile-only" : "🔗 Linked"}
                </span>
              </td>
              <td className="px-4 py-3 text-xs font-bold text-slate-600 capitalize">
                {l.relationship}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "px-2 py-1 rounded-lg border text-3xs font-black uppercase tracking-widest",
                    STATUS_STYLE[l.status] || STATUS_STYLE.invited,
                  )}
                >
                  {l.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1 max-w-[220px]">
                  {(l.live_scopes || []).map((s) => (
                    <span
                      key={s}
                      className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-3xs font-bold text-slate-500"
                    >
                      {s}
                    </span>
                  ))}
                  {(l.live_scopes || []).length === 0 && (
                    <span className="text-3xs text-slate-300">—</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-xs font-bold text-slate-600">
                {l.caregiver_dependent_count} / {l.caregiver_limit}
              </td>
              <td className="px-4 py-3 text-3xs font-bold text-slate-400 uppercase tracking-widest">
                {format(new Date(l.created_at), "dd MMM yyyy")}
              </td>
            </tr>
          ))}
          {links.length === 0 && (
            <tr>
              <td
                colSpan={7}
                className="p-10 text-center text-xs font-bold text-slate-400 uppercase tracking-widest"
              >
                No family links yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
