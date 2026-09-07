"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  useAnatomyConditions,
  useBodyParts,
} from "@/features/anatomy/data/useAnatomy";

const inputCls =
  "h-9 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white";

const severityBadge = (severity: string | null) => {
  const s = (severity || "").toLowerCase();
  if (s.includes("severe") || s === "critical") return "badge badge-red";
  if (s.includes("moderate")) return "badge badge-amber";
  if (s.includes("mild")) return "badge badge-green";
  return "badge badge-slate";
};

export default function ConditionsLinkedTab() {
  const [search, setSearch] = useState("");
  const [bodyPartId, setBodyPartId] = useState("");

  const { data: parts } = useBodyParts("all");
  const { data: rows, isLoading } = useAnatomyConditions({
    search: search.trim() || undefined,
    bodyPartId: bodyPartId || undefined,
  });

  const bodyPartOptions = useMemo(
    () =>
      (parts?.parts ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
    [parts],
  );

  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-4">
        <h3 className="section-heading">
          🔗 Conditions Linked to Body Parts
        </h3>
        <span className="badge badge-blue">{rows?.length ?? 0} links</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            className={`${inputCls} w-56`}
            placeholder="Search condition or body part…"
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
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-2xs font-black uppercase tracking-widest text-slate-400">
              <th className="px-5 py-3">Body Part</th>
              <th className="px-5 py-3">Condition</th>
              <th className="px-5 py-3">Severity</th>
              <th className="px-5 py-3">Specialist</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-10 text-center text-slate-400"
                >
                  Loading condition links…
                </td>
              </tr>
            )}
            {!isLoading && (rows ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-10 text-center text-slate-400"
                >
                  No condition ↔ body-part links found.
                </td>
              </tr>
            )}
            {!isLoading &&
              (rows ?? []).map((row) => (
                <tr
                  key={`${row.condition_id}-${row.body_part_id}`}
                  className="border-b border-slate-50 hover:bg-slate-50/60"
                >
                  <td className="px-5 py-3 font-bold text-slate-800">
                    {row.body_part_name}
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/diseases?id=${row.condition_id}`}
                      className="font-semibold text-emerald-700 hover:underline"
                    >
                      {row.condition_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span className={severityBadge(row.severity)}>
                      {row.severity || "unknown"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {row.specialist || "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        row.status === "published"
                          ? "badge badge-green"
                          : "badge badge-slate"
                      }
                    >
                      {row.status || "—"}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
