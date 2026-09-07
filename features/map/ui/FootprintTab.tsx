"use client";

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn, getColorForId } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv";
import { useHasPermission } from "@/stores/permission-context";
import {
  collectorDisplayId,
  footprintDisplayId,
  useFootprints,
  useMapCollectors,
} from "@/features/map/data/useMap";

const ACTIVITY_LABELS: Record<string, string> = {
  registered: "🏥 Registered",
  survey: "📋 Survey",
  documented: "📸 Documented",
};

const GPS_BADGES: Record<string, string> = {
  active: "badge-green",
  weak: "badge-amber",
  inactive: "badge-slate",
};

const FootprintTab = () => {
  const canExport = useHasPermission("map.export");

  const [collectorFilter, setCollectorFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data: collectorsData, isLoading: collectorsLoading } = useMapCollectors();
  const { data: footprintsData, isLoading: footprintsLoading, refetch } = useFootprints({
    collector: collectorFilter !== "all" ? collectorFilter : undefined,
    activity: activityFilter !== "all" ? activityFilter : undefined,
    region: regionFilter || undefined,
    from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
    to: dateTo ? new Date(`${dateTo}T23:59:59`).toISOString() : undefined,
    page,
    limit,
  });

  const footprints = footprintsData?.footprints ?? [];
  const meta = footprintsData?.meta;
  const collectors = collectorsData?.collectors ?? [];

  const todayPointsByCollector = useMemo(() => {
    const today = new Date().toDateString();
    const counts = new Map<string, number>();
    for (const fp of footprints) {
      if (new Date(fp.created_at).toDateString() === today) {
        counts.set(fp.collector_id, (counts.get(fp.collector_id) ?? 0) + 1);
      }
    }
    return counts;
  }, [footprints]);

  const handleExport = () => {
    if (!footprints.length) {
      toast.error("Nothing to export with the current filters");
      return;
    }
    downloadCsv(
      footprints.map((fp) => ({
        id: footprintDisplayId(fp.id),
        collector: `${fp.collector?.first_name ?? ""} ${fp.collector?.last_name ?? ""}`.trim(),
        region: fp.region ?? "",
        area_district: fp.district ?? "",
        gps: `${fp.latitude.toFixed(6)}, ${fp.longitude.toFixed(6)}`,
        facility_visited: fp.facility?.facility_name ?? "",
        activity: fp.activity,
        timestamp: fp.created_at,
      })),
      "footprint-log",
    );
    toast.success("Footprint log exported");
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Per-collector toggle cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {collectorsLoading ? (
          <div className="card col-span-full text-center text-xs text-slate-400 py-6">
            Loading collectors…
          </div>
        ) : collectors.length === 0 ? (
          <div className="card col-span-full text-center text-xs text-slate-400 py-6">
            No collectors yet — add one from the Collectors tab.
          </div>
        ) : (
          collectors.map((collector) => {
            const name =
              `${collector.user?.first_name ?? ""} ${collector.user?.last_name ?? ""}`.trim() ||
              collector.user_id.slice(0, 8);
            const selected = collectorFilter === collector.user_id;
            return (
              <button
                key={collector.id}
                onClick={() => {
                  setCollectorFilter(selected ? "all" : collector.user_id);
                  setPage(1);
                }}
                className={cn(
                  "card text-left transition-all cursor-pointer hover:shadow-md",
                  selected && "ring-2 ring-emerald-500 border-emerald-300",
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: getColorForId(collector.user_id) }}
                    />
                    <span className="text-xs font-black text-slate-800">{name}</span>
                  </span>
                  <span className={cn("badge text-3xs uppercase", GPS_BADGES[collector.gps_status])}>
                    GPS {collector.gps_status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-2xs font-semibold text-slate-500">
                  <span>
                    {collectorDisplayId(collector.id)} · {collector.assigned_region || "No region"}
                  </span>
                  <span>{todayPointsByCollector.get(collector.user_id) ?? 0} pts today</span>
                </div>
                <div className="text-3xs text-slate-400 mt-1">
                  Last seen:{" "}
                  {collector.last_active
                    ? new Date(collector.last_active).toLocaleString()
                    : "Never"}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-2xs font-black uppercase tracking-widest text-slate-400">
              Activity
            </label>
            <select
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-600 font-medium"
              value={activityFilter}
              onChange={(e) => {
                setActivityFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Activities</option>
              <option value="registered">Registered</option>
              <option value="survey">Survey</option>
              <option value="documented">Documented</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-2xs font-black uppercase tracking-widest text-slate-400">
              Region
            </label>
            <input
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg w-40"
              placeholder="Filter by region…"
              value={regionFilter}
              onChange={(e) => {
                setRegionFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-2xs font-black uppercase tracking-widest text-slate-400">
              From
            </label>
            <input
              type="date"
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-2xs font-black uppercase tracking-widest text-slate-400">
              To
            </label>
            <input
              type="date"
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => refetch()}>
            🔄 Refresh
          </button>
          {canExport && (
            <button className="btn btn-secondary btn-sm" onClick={handleExport}>
              📥 Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Footprint log table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {["Point", "Collector", "Region", "Area / District", "GPS Coordinates", "Facility Visited", "Activity", "Timestamp"].map(
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
              {footprintsLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Loading footprint log…
                  </td>
                </tr>
              ) : footprints.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No footprint points match the current filters.
                  </td>
                </tr>
              ) : (
                footprints.map((fp) => (
                  <tr key={fp.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-black text-slate-700">
                      {footprintDisplayId(fp.id)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: getColorForId(fp.collector_id) }}
                        />
                        {`${fp.collector?.first_name ?? ""} ${fp.collector?.last_name ?? ""}`.trim() ||
                          fp.collector_id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">{fp.region || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {[fp.area, fp.district].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-2xs text-slate-500">
                      {fp.latitude.toFixed(5)}, {fp.longitude.toFixed(5)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {fp.facility?.facility_name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge badge-blue">{ACTIVITY_LABELS[fp.activity] ?? fp.activity}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(fp.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-2xs font-semibold text-slate-400">
              {meta.total.toLocaleString()} points · page {meta.page}/{meta.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FootprintTab;
