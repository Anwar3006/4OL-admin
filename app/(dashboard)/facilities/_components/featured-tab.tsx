"use client";

/**
 * Featured placements tab (Gap Analysis Part H, H1/H6, H-D3/H-D4).
 * Paid vs Admin-Set distinction comes from feature_type; Impressions uses
 * view_count; CTR and Bookings show honest "—" placeholders until the
 * booking/CTR pipelines exist (H-D4).
 */

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useHasPermission } from "@/stores/permission-context";
import {
  useFacilitiesApiList,
  usePauseFeaturedApi,
  useSetFeaturedApi,
} from "@/hooks/supabase-calls/useFacilitiesApi";

const FeaturedTab = () => {
  const canFeature = useHasPermission("facilities.feature");
  const { data: featuredData, isLoading: featuredLoading } =
    useFacilitiesApiList({ featured: "yes", limit: 100 });
  const { data: candidatesData } = useFacilitiesApiList({
    featured: "no",
    status: "active",
    limit: 20,
  });

  const setFeatured = useSetFeaturedApi();
  const pauseFeatured = usePauseFeaturedApi();

  const featured = useMemo(() => featuredData?.data ?? [], [featuredData]);
  const candidates = useMemo(
    () => candidatesData?.data ?? [],
    [candidatesData],
  );
  const expiringSoon = useMemo(() => {
    const now = Date.now();
    return featured.filter((row) => {
      if (!row.feature_end) return false;
      const end = new Date(row.feature_end).getTime();
      return end > now && end < now + 7 * 24 * 3600 * 1000;
    }).length;
  }, [featured]);

  return (
    <div className="space-y-4">
      {!canFeature && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl px-4 py-3 text-[11px] font-bold text-purple-800">
          🛡️ Editing featured placements requires the facilities.feature
          permission (Super Admin). Read-only view below.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            🌟 Featured Placements ({featured.length})
          </p>
          {expiringSoon > 0 && (
            <span className="text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-3 py-1">
              ⚠️ {expiringSoon} expiring within 7 days
            </span>
          )}
        </div>

        {featuredLoading ? (
          <p className="px-5 py-8 text-center text-[11px] font-bold text-slate-400">
            Loading featured placements...
          </p>
        ) : featured.length === 0 ? (
          <p className="px-5 py-8 text-center text-[11px] font-bold text-slate-400">
            No featured placements yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <th className="px-5 py-3">Facility</th>
                  <th className="px-3 py-3">Source</th>
                  <th className="px-3 py-3">Window</th>
                  <th className="px-3 py-3">Impressions</th>
                  <th className="px-3 py-3">CTR</th>
                  <th className="px-3 py-3">Status</th>
                  {canFeature && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {featured.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <p className="text-[12px] font-black text-slate-800">
                        {row.facility_name}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {row.facility_type?.replace(/_/g, " ")} · {row.region}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "text-[9px] font-black uppercase tracking-widest rounded-full px-2.5 py-1 border",
                          row.feature_type === "paid"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-sky-50 text-sky-700 border-sky-100",
                        )}
                      >
                        {row.feature_type === "paid" ? "💳 Paid" : "🛠️ Admin-Set"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[10px] font-bold text-slate-500">
                      {row.feature_start
                        ? new Date(row.feature_start).toLocaleDateString("en-GB")
                        : "—"}{" "}
                      →{" "}
                      {row.feature_end
                        ? new Date(row.feature_end).toLocaleDateString("en-GB")
                        : "Open-ended"}
                    </td>
                    <td className="px-3 py-3 text-[11px] font-black text-slate-700">
                      {(row.view_count ?? 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-[11px] font-bold text-slate-400">
                      —{" "}
                      <span className="text-[8px] uppercase tracking-widest">
                        awaiting click pipeline
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {row.is_featured_paused ? (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2.5 py-1">
                          ⏸ Paused
                        </span>
                      ) : row.feature_end &&
                        new Date(row.feature_end).getTime() < Date.now() ? (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-red-50 text-red-600 border border-red-100 rounded-full px-2.5 py-1">
                          Expired
                        </span>
                      ) : (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2.5 py-1">
                          ● Live
                        </span>
                      )}
                    </td>
                    {canFeature && (
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button
                          className="btn btn-secondary btn-sm mr-1"
                          disabled={pauseFeatured.isPending}
                          onClick={() =>
                            pauseFeatured.mutate({
                              id: row.id,
                              paused: !row.is_featured_paused,
                            })
                          }
                        >
                          {row.is_featured_paused ? "▶️ Resume" : "⏸ Pause"}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={setFeatured.isPending}
                          onClick={() =>
                            setFeatured.mutate({ id: row.id, featured: false })
                          }
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canFeature && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Feature an Active Facility
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {candidates.length === 0 ? (
              <p className="px-5 py-6 text-center text-[11px] font-bold text-slate-400">
                No non-featured active facilities found.
              </p>
            ) : (
              candidates.map((row) => (
                <div key={row.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-black text-slate-800 truncate">
                      {row.facility_name}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                      {row.facility_type?.replace(/_/g, " ")} · {row.region} ·
                      Plan: {row.subscription_tier ?? "free"}
                    </p>
                  </div>
                  <button
                    className="btn btn-primary btn-sm text-white"
                    disabled={setFeatured.isPending}
                    onClick={() =>
                      setFeatured.mutate({
                        id: row.id,
                        featured: true,
                        feature_type: row.subscription_tier ? "paid" : "admin",
                      })
                    }
                  >
                    🌟 Feature
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeaturedTab;
