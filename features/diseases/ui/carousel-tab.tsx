"use client";

/**
 * Carousel Features tab (Gap Analysis Part I, I1/I6/I-D3).
 * Shows current carousel occupancy (cap = 12), the featured conditions
 * ordered by slot, and a one-click add/remove surface. The cap is enforced
 * server-side by PUT /api/diseases/[id]/feature; a full carousel surfaces
 * the 409 message via toast.
 */

import React from "react";
import { toast } from "sonner";
import {
  useDiseasesList,
  useFeatureCondition,
} from "@/features/diseases/data/useDiseasesApi";

const CAROUSEL_CAP = 12;

const CarouselTab = () => {
  const { data: featuredData, isLoading: loadingFeatured } = useDiseasesList({
    params: { page: 1, limit: 100, search: "", featured: "yes" },
    enabled: true,
  });
  const { data: availableData, isLoading: loadingAvailable } = useDiseasesList({
    params: { page: 1, limit: 20, search: "", featured: "no" },
    enabled: true,
  });

  const { mutate: setFeatured, isPending } = useFeatureCondition();

  const featured = [...(featuredData?.conditions ?? [])].sort(
    (a: any, b: any) => (a.featured_order ?? 99) - (b.featured_order ?? 99),
  );
  const available = availableData?.conditions ?? [];
  const occupancy = featured.length;

  return (
    <div className="space-y-6">
      {/* Occupancy header */}
      <div className="card p-5 border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
              🎠 Carousel Occupancy
            </h3>
            <p className="text-xs text-slate-500 font-bold mt-1">
              {occupancy} of {CAROUSEL_CAP} slots in use · home-screen rotation
              is app-side, this manages the featured set
            </p>
          </div>
          <span
            className={
              occupancy >= CAROUSEL_CAP ? "badge badge-amber" : "badge badge-green"
            }
          >
            {occupancy >= CAROUSEL_CAP ? "Full" : `${CAROUSEL_CAP - occupancy} slots free`}
          </span>
        </div>
        <div className="mt-4 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-emerald-600 transition-all"
            style={{ width: `${Math.min(100, (occupancy / CAROUSEL_CAP) * 100)}%` }}
          />
        </div>
      </div>

      {/* Featured slots */}
      <div className="card p-0 overflow-hidden border-slate-200 dark:border-slate-700">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h4 className="section-heading">
            Featured Conditions (by slot order)
          </h4>
        </div>
        {loadingFeatured ? (
          <div className="p-8 text-center text-xs font-bold text-slate-400">
            Loading carousel…
          </div>
        ) : featured.length === 0 ? (
          <div className="p-8 text-center text-xs font-bold text-slate-400">
            No conditions are featured yet — add some from the list below.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {featured.map((row: any) => (
              <li
                key={row.id}
                className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-900/60 transition-colors"
              >
                <span className="h-8 w-8 shrink-0 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-100 dark:border-emerald-500/30 flex items-center justify-center text-xs font-black text-emerald-700 dark:text-emerald-400">
                  {row.featured_order ?? "–"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {row.name}
                  </div>
                  <div className="text-2xs text-slate-400 font-semibold">
                    {row.featured_from
                      ? `Featured since ${new Date(row.featured_from).toLocaleDateString()}`
                      : "No featured date"}
                  </div>
                </div>
                <span className="text-xs font-black text-slate-600 dark:text-slate-300">
                  👁️ {(row.view_count ?? 0).toLocaleString()}
                </span>
                <button
                  className="btn btn-secondary h-8 px-3 text-2xs font-black uppercase tracking-widest"
                  disabled={isPending}
                  onClick={() => setFeatured({ id: row.id, featured: false })}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Available to feature */}
      <div className="card p-0 overflow-hidden border-slate-200 dark:border-slate-700">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h4 className="section-heading">
            Not Featured Yet
          </h4>
        </div>
        {loadingAvailable ? (
          <div className="p-8 text-center text-xs font-bold text-slate-400">
            Loading…
          </div>
        ) : available.length === 0 ? (
          <div className="p-8 text-center text-xs font-bold text-slate-400">
            Every condition is already featured.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {available.map((row: any) => (
              <li
                key={row.id}
                className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-900/60 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {row.name}
                  </div>
                  <div className="text-2xs text-slate-400 font-semibold">
                    {(row.categories || []).join(", ") || "Uncategorised"}
                  </div>
                </div>
                <button
                  className="btn btn-secondary h-8 px-3 text-2xs font-black uppercase tracking-widest"
                  disabled={isPending || occupancy >= CAROUSEL_CAP}
                  onClick={() => {
                    if (occupancy >= CAROUSEL_CAP) {
                      toast.error(
                        `Carousel is full — up to ${CAROUSEL_CAP} conditions can be featured (I-D3).`,
                      );
                      return;
                    }
                    setFeatured({ id: row.id, featured: true });
                  }}
                >
                  ⭐ Feature
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CarouselTab;
