"use client";

import { Users } from "lucide-react";
import KpiCard from "@/components/redesign/KpiCard";
import { cn } from "@/lib/utils";
import type { Row } from "@/features/period/schema/types";
import { status } from "./formatters";


export default function TtcOperations({
  stats,
  checklistReadiness,
  ovulationBreakdown,
  insightBreakdown,
}: {
  stats: Row;
  checklistReadiness: Row[];
  ovulationBreakdown: Row | null;
  insightBreakdown: Row[];
}) {
  const bars = ovulationBreakdown
    ? [
        { label: "Positive (LH surge)", value: Number(ovulationBreakdown.positive ?? 0), className: "bg-emerald-500", text: "text-emerald-600" },
        { label: "Negative", value: Number(ovulationBreakdown.negative ?? 0), className: "bg-blue-500", text: "text-blue-600" },
        { label: "Invalid / unclear", value: Number(ovulationBreakdown.invalid ?? 0), className: "bg-amber-500", text: "text-amber-600" },
        { label: "Device / offline sync", value: Number(ovulationBreakdown.deviceOrSync ?? 0), className: "bg-slate-400", text: "text-slate-500" },
      ]
    : [];
  const totalTests = Math.max(1, Number(ovulationBreakdown?.total ?? 0));
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900">
        <strong>Plasence TTC mode — aggregates and masked metadata only.</strong>{" "}
        Intimate per-user details (sexual activity, encrypted notes) are never
        exposed here. Copy stays educational and non-diagnostic: "likely",
        "estimated", "may".
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon="🤰"
          label="TTC Profiles"
          value={`${stats.ttcProfiles ?? 0} (${stats.adoptionPercent ?? "0%"} of trackers)`}
          variant="purple"
        />
        <KpiCard
          icon="✅"
          label="Checklist ≥ 50%"
          value={stats.checklistHalfPercent ?? "0%"}
          variant="green"
        />
        <KpiCard
          icon="🧪"
          label="Ovulation Tests (30d)"
          value={String(stats.ovulationTests30d ?? 0)}
          variant="blue"
        />
        <KpiCard
          icon="🩺"
          label="Preconception Visits"
          value={`${stats.visitsPlanned ?? 0} planned · ${stats.visitsCompleted ?? 0} completed`}
          variant="teal"
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card overflow-hidden" aria-labelledby="ttc-readiness-heading">
          <div className="card-header">
            <div>
              <h3 id="ttc-readiness-heading" className="card-title">
                Preconception checklist readiness
              </h3>
              <p className="text-xs text-slate-500">
                Share of TTC users who marked each checklist item done
                (aggregated).
              </p>
            </div>
          </div>
          <div className="space-y-3 p-4">
            {checklistReadiness.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <span className="w-56 shrink-0 truncate text-sm text-slate-700">
                  {item.title}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-purple-500"
                    style={{ width: `${Math.min(100, Number(item.donePercent ?? 0))}%` }}
                  />
                </div>
                <span className="w-12 text-right text-xs font-semibold text-purple-700">
                  {item.donePercent ?? "0%"}
                </span>
              </div>
            ))}
            {!checklistReadiness.length && (
              <p className="text-sm text-slate-500">
                No checklist items are active yet.
              </p>
            )}
          </div>
        </section>
        <section className="card overflow-hidden" aria-labelledby="ttc-tests-heading">
          <div className="card-header">
            <div>
              <h3 id="ttc-tests-heading" className="card-title">
                Ovulation test results (last 30 days)
              </h3>
              <p className="text-xs text-slate-500">
                Results never imply pregnancy — escalation copy encourages
                qualified care.
              </p>
            </div>
          </div>
          <div className="space-y-3 p-4">
            {bars.map((bar) => (
              <div key={bar.label} className="flex items-center gap-3">
                <span className="w-56 shrink-0 truncate text-sm text-slate-700">
                  {bar.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn("h-2 rounded-full", bar.className)}
                    style={{ width: `${Math.min(100, (bar.value / totalTests) * 100)}%` }}
                  />
                </div>
                <span className={cn("w-12 text-right text-xs font-semibold", bar.text)}>
                  {bar.value}
                </span>
              </div>
            ))}
            {!bars.length && (
              <p className="text-sm text-slate-500">No ovulation tests logged.</p>
            )}
            {ovulationBreakdown?.topBrands && (
              <p className="text-[11px] text-slate-400">
                Top brands: {ovulationBreakdown.topBrands}
              </p>
            )}
          </div>
        </section>
      </div>
      <section className="card overflow-hidden" aria-labelledby="ttc-insights-heading">
        <div className="card-header">
          <div>
            <h3 id="ttc-insights-heading" className="card-title">
              Fertility insight cards generated (non-diagnostic)
            </h3>
            <p className="text-xs text-slate-500">
              Last 7 days · copy uses "likely", "estimated", "may" only.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="p-3">Insight Type</th>
                <th className="p-3">Generated (7d)</th>
                <th className="p-3">Avg Confidence</th>
                <th className="p-3">Shown to Users</th>
                <th className="p-3">Dismissed</th>
                <th className="p-3">Evidence Fields</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {insightBreakdown.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="p-3">
                    <span className="badge badge-purple">
                      {String(item.insightType).replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="p-3 font-medium">{item.generated7d}</td>
                  <td className="p-3">{item.averageConfidence ?? "—"}</td>
                  <td className="p-3">{item.shown}</td>
                  <td className="p-3">{item.dismissedPercent}</td>
                  <td className="p-3 text-xs">{item.evidenceFields}</td>
                  <td className="p-3">{status(item.status)}</td>
                </tr>
              ))}
              {!insightBreakdown.length && (
                <tr>
                  <td colSpan={7} className="p-4 text-slate-500">
                    No insight cards generated in the last 7 days.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
