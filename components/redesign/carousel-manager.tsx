"use client";

/**
 * Shared carousel slot manager (Analytics/Carousels build, Phase 5b).
 * Same layout/semantics as the Diseases carousel-tab: occupancy bar with
 * cap = 12, featured list ordered by slot, one-click add/remove. The cap is
 * enforced server-side by the module's /feature route (409 when full).
 */

import React from "react";
import { toast } from "sonner";

export const CAROUSEL_CAP = 12;

interface CarouselRow {
  id: string;
  name: string;
  view_count?: number;
  featured_order?: number | null;
  featured_from?: string | null;
  status?: string;
  categories?: string[];
}

interface CarouselManagerProps {
  entityLabel: string;
  featured: CarouselRow[];
  available: CarouselRow[];
  isLoadingFeatured: boolean;
  isLoadingAvailable: boolean;
  isPending: boolean;
  onSetFeatured: (vars: { id: string; featured: boolean }) => void;
}

const CarouselManager = ({
  entityLabel,
  featured,
  available,
  isLoadingFeatured,
  isLoadingAvailable,
  isPending,
  onSetFeatured,
}: CarouselManagerProps) => {
  const occupancy = featured.length;

  return (
    <div className="space-y-6">
      {/* Occupancy header */}
      <div className="card p-5 border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">
              🎠 Carousel Occupancy
            </h3>
            <p className="text-xs text-slate-500 font-bold mt-1">
              {occupancy} of {CAROUSEL_CAP} {entityLabel} slots in use ·
              home-screen rotation is app-side, this manages the featured set
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
        <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-emerald-600 transition-all"
            style={{ width: `${Math.min(100, (occupancy / CAROUSEL_CAP) * 100)}%` }}
          />
        </div>
      </div>

      {/* Featured slots */}
      <div className="card p-0 overflow-hidden border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <h4 className="section-heading">
            Featured (by slot order)
          </h4>
        </div>
        {isLoadingFeatured ? (
          <div className="p-8 text-center text-xs font-bold text-slate-400">
            Loading carousel…
          </div>
        ) : featured.length === 0 ? (
          <div className="p-8 text-center text-xs font-bold text-slate-400">
            Nothing is featured yet — add some from the list below.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {featured.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/60 transition-colors"
              >
                <span className="h-8 w-8 shrink-0 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xs font-black text-emerald-700">
                  {row.featured_order ?? "–"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800 truncate">
                    {row.name}
                  </div>
                  <div className="text-2xs text-slate-400 font-semibold">
                    {row.featured_from
                      ? `Featured since ${new Date(row.featured_from).toLocaleDateString()}`
                      : "No featured date"}
                  </div>
                </div>
                <span className="text-xs font-black text-slate-600">
                  👁️ {(row.view_count ?? 0).toLocaleString()}
                </span>
                <button
                  className="btn btn-secondary h-8 px-3 text-2xs font-black uppercase tracking-widest"
                  disabled={isPending}
                  onClick={() => onSetFeatured({ id: row.id, featured: false })}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Available to feature */}
      <div className="card p-0 overflow-hidden border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <h4 className="section-heading">
            Not Featured Yet (published, by views)
          </h4>
        </div>
        {isLoadingAvailable ? (
          <div className="p-8 text-center text-xs font-bold text-slate-400">
            Loading…
          </div>
        ) : available.length === 0 ? (
          <div className="p-8 text-center text-xs font-bold text-slate-400">
            No published {entityLabel} left to feature.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {available.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/60 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800 truncate">
                    {row.name}
                  </div>
                  <div className="text-2xs text-slate-400 font-semibold">
                    {(row.categories || []).join(", ") ||
                      `👁️ ${(row.view_count ?? 0).toLocaleString()} views`}
                  </div>
                </div>
                <button
                  className="btn btn-secondary h-8 px-3 text-2xs font-black uppercase tracking-widest"
                  disabled={isPending || occupancy >= CAROUSEL_CAP}
                  onClick={() => {
                    if (occupancy >= CAROUSEL_CAP) {
                      toast.error(
                        `Carousel is full — up to ${CAROUSEL_CAP} items can be featured.`,
                      );
                      return;
                    }
                    onSetFeatured({ id: row.id, featured: true });
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

export default CarouselManager;
