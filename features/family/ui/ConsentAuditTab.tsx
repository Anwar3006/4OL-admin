"use client";

import React from "react";
import { format } from "date-fns";
import { useConsentScopes } from "../data/useFamily";
import { cn } from "@/lib/utils";

// AF-01 — Consent Audit tab: grant/revoke trail for dependent_share_scopes.
// Compliance-officer viewable (family.view). This is the Act 843 audit trail.

export default function ConsentAuditTab() {
  const { data, isLoading, isError, error } = useConsentScopes();
  const rows = data ?? [];

  if (isError) {
    return (
      <div className="p-10 text-center text-xs font-bold text-rose-400 mt-4">
        Consent audit unavailable — apply the AF-01 family_circle migration.
        <div className="text-2xs mt-2">{(error as Error)?.message}</div>
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
            {["Dependent", "Scope", "State", "Granted", "Revoked"].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-3xs font-black uppercase tracking-widest text-slate-400"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr
              key={s.id}
              className="border-b border-slate-100 dark:border-slate-700/60 last:border-0"
            >
              <td className="px-4 py-3 text-xs font-black text-slate-800 dark:text-slate-100">
                {s.dependents?.display_name || "—"}
              </td>
              <td className="px-4 py-3">
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-3xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                  {s.scope}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "px-2 py-1 rounded-lg border text-3xs font-black uppercase tracking-widest",
                    s.revoked_at
                      ? "bg-rose-50 text-rose-600 border-rose-200"
                      : "bg-emerald-50 text-emerald-600 border-emerald-200",
                  )}
                >
                  {s.revoked_at ? "Revoked" : "Live"}
                </span>
              </td>
              <td className="px-4 py-3 text-3xs font-bold text-slate-400 uppercase tracking-widest">
                {format(new Date(s.granted_at), "dd MMM yyyy HH:mm")}
              </td>
              <td className="px-4 py-3 text-3xs font-bold text-slate-400 uppercase tracking-widest">
                {s.revoked_at ? format(new Date(s.revoked_at), "dd MMM yyyy HH:mm") : "—"}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="p-10 text-center text-xs font-bold text-slate-400 uppercase tracking-widest"
              >
                No consent grants recorded yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
