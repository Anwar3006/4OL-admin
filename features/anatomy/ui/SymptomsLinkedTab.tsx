"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useAnatomySymptoms, useBodyParts } from "@/features/anatomy/data/useAnatomy";

const inputCls =
  "h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white dark:bg-slate-800";

const severityBadge = (severity: string | null) => {
  const s = (severity || "").toLowerCase();
  if (s.includes("severe") || s === "critical") return "badge badge-red";
  if (s.includes("moderate")) return "badge badge-amber";
  if (s.includes("mild")) return "badge badge-green";
  return "badge badge-slate";
};

export default function SymptomsLinkedTab() {
  const [search, setSearch] = useState("");
  const [bodyPartId, setBodyPartId] = useState("");
  const [severity, setSeverity] = useState("");

  const { data: parts } = useBodyParts("all");
  const { data: rows, isLoading } = useAnatomySymptoms({
    search: search.trim() || undefined,
    bodyPartId: bodyPartId || undefined,
    severity: severity || undefined,
  });

  const bodyPartOptions = useMemo(
    () => (parts?.parts ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
    [parts],
  );

  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-800 px-5 py-4">
        <h3 className="section-heading">
          🩺 Symptoms Linked to Body Parts
        </h3>
        <span className="badge badge-purple">{rows?.length ?? 0} links</span>
        {/* Phase 4 cross-link: symptom taxonomy lives on the Symptoms menu */}
        <Link
          href="/symptoms?tab=categories"
          className="badge badge-blue hover:opacity-80 transition-opacity"
        >
          📂 Symptom Categories →
        </Link>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            className={`${inputCls} w-56`}
            placeholder="Search symptom or body part…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={inputCls}
            value={bodyPartId}
            onChange={(e) => setBodyPartId(e.target.value)}
          >
            <option value="">All body parts</option>
            {bodyPartOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            className={inputCls}
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >
            <option value="">All severities</option>
            <option value="mild">Mild</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-2xs font-black uppercase tracking-widest text-slate-400">
              <th className="px-5 py-3">Body Part</th>
              <th className="px-5 py-3">Symptom</th>
              <th className="px-5 py-3">Severity</th>
              <th className="px-5 py-3">Systemic</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-slate-400">
                  Loading symptom links…
                </td>
              </tr>
            )}
            {!isLoading && (rows ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-slate-400">
                  No symptom ↔ body-part links found.
                </td>
              </tr>
            )}
            {!isLoading &&
              (rows ?? []).map((row) => (
                <tr
                  key={`${row.symptom_id}-${row.body_part_id}`}
                  className="border-b border-slate-50 hover:bg-slate-50/60 dark:hover:bg-slate-900/60"
                >
                  <td className="px-5 py-3 font-bold text-slate-800 dark:text-slate-200">{row.body_part_name}</td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/symptoms?id=${row.symptom_id}`}
                      className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      {row.symptom_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span className={severityBadge(row.severity)}>
                      {row.severity || "unknown"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {row.is_systemic ? (
                      <span className="badge badge-amber">Systemic</span>
                    ) : (
                      <span className="badge badge-slate">Localised</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
