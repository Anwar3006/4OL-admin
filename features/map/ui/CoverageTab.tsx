"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useHasPermission } from "@/stores/permission-context";
import { useCoverageReport, usePrioritizeRegion } from "@/features/map/data/useMap";

const STATUS_BADGES: Record<string, string> = {
  Good: "badge-green",
  Moderate: "badge-blue",
  Low: "badge-amber",
  Critical: "badge-red",
};

const CoverageTab = () => {
  const router = useRouter();
  const canManage = useHasPermission("users.edit");
  const { data, isLoading } = useCoverageReport();
  const prioritizeRegion = usePrioritizeRegion();

  const regions = data?.regions ?? [];

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="alert al-ic">
        Coverage = districts with at least one active facility ÷ districts in
        the national district list. Use “+ Assign Collector” to staff weak
        regions and 🔺 to flag a region for priority fieldwork.
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {[
                  "Region",
                  "Facilities",
                  "Footprint Pts",
                  "Collectors",
                  "Districts Covered",
                  "Coverage",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Compiling coverage report…
                  </td>
                </tr>
              ) : (
                regions.map((row) => (
                  <tr
                    key={row.region_key}
                    className={cn(
                      "border-b border-slate-50 hover:bg-slate-50/50",
                      row.prioritized && "bg-amber-50/40",
                    )}
                  >
                    <td className="px-4 py-3 font-black text-slate-700">
                      {row.prioritized && <span title="Prioritized">🔺 </span>}
                      {row.region}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.facilities_registered.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.footprint_points.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.collectors_assigned}
                      {row.collectors_active > 0 && (
                        <span className="text-emerald-600"> ({row.collectors_active} active)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.districts_covered}/{row.districts_total}
                    </td>
                    <td className="px-4 py-3 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              row.coverage_percent >= 75
                                ? "bg-emerald-500"
                                : row.coverage_percent >= 50
                                  ? "bg-blue-500"
                                  : row.coverage_percent >= 25
                                    ? "bg-amber-500"
                                    : "bg-red-500",
                            )}
                            style={{ width: `${row.coverage_percent}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-slate-600 w-8">
                          {row.coverage_percent}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("badge uppercase text-[8px] font-black", STATUS_BADGES[row.status])}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {canManage && (
                          <>
                            <button
                              className="btn btn-secondary btn-sm text-[10px]"
                              onClick={() => router.push("/map?tab=collectors")}
                            >
                              + Assign Collector
                            </button>
                            <button
                              className="btn btn-secondary btn-sm text-[10px]"
                              disabled={prioritizeRegion.isPending}
                              onClick={() =>
                                prioritizeRegion.mutate({
                                  region: row.region_key,
                                  prioritize: !row.prioritized,
                                })
                              }
                            >
                              {row.prioritized ? "⬇ Deprioritize" : "🔺 Prioritize"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CoverageTab;
