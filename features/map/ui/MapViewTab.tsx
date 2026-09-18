"use client";

import React, { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import GoogleMapContainer from "./GoogleMapContainer";
import FilterDropdown from "./FilterDropdown";
import ghanaLocations from "@/constants/ghana-locations.json";
import { FACILITY_TYPE_OPTIONS } from "@/types/formInput";
import { cn } from "@/lib/utils";
import { useMapCollectors } from "@/features/map/data/useMap";
import { useHasPermission } from "@/stores/permission-context";

interface MapViewTabProps {
  fullScreen?: boolean;
}

const LAYER_DEFS = [
  { key: "facilities", label: "Facilities", color: "bg-emerald-500" },
  { key: "footprints", label: "Footprints", color: "bg-orange-400" },
  { key: "ibp", label: "IBP Businesses", color: "bg-violet-500" },
  { key: "outdoorRoutes", label: "Outdoor Routes", color: "bg-green-500" },
] as const;

const MapViewTab = ({ fullScreen = false }: MapViewTabProps) => {
  const searchParams = useSearchParams();
  const focusRouteId = searchParams.get("route");

  const [filters, setFilters] = useState<{
    region: string | null;
    district: string | null;
    facilityType: string | null;
    status: string | null;
  }>({ region: null, district: null, facilityType: null, status: null });

  const [layers, setLayers] = useState({
    facilities: true,
    footprints: true,
    ibp: false,
    outdoorRoutes: true,
  });

  // Collector filter is staff PII — only offered with users.view (F-D6).
  const canViewFootprints = useHasPermission("users.view");
  const [collectorFilter, setCollectorFilter] = useState("all");
  const { data: collectorsData } = useMapCollectors();

  const regions = useMemo(() => Object.keys(ghanaLocations), []);
  const districts = useMemo(() => {
    if (!filters.region) return [];
    return (ghanaLocations as Record<string, string[]>)[filters.region] || [];
  }, [filters.region]);

  const handleRegionChange = (val: string | null) => {
    setFilters((prev) => ({ ...prev, region: val, district: null }));
  };

  return (
    <div className="space-y-4">
      {/* Filters + layer toggles */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-4 items-end">
          <FilterDropdown
            label="Region"
            value={filters.region}
            options={regions}
            onChange={handleRegionChange}
          />
          <FilterDropdown
            label="District"
            value={filters.district}
            options={districts}
            onChange={(val) => setFilters((prev) => ({ ...prev, district: val }))}
          />
          <FilterDropdown
            label="Facility Type"
            value={filters.facilityType}
            options={FACILITY_TYPE_OPTIONS.map((opt) => opt.label)}
            onChange={(val) => setFilters((prev) => ({ ...prev, facilityType: val }))}
          />
          <FilterDropdown
            label="Status"
            value={filters.status}
            options={["Active", "Pending", "Suspended"]}
            onChange={(val) => setFilters((prev) => ({ ...prev, status: val }))}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
          <span className="text-2xs font-black uppercase tracking-widest text-slate-400">
            Layers
          </span>
          {LAYER_DEFS.map((layer) => (
            <button
              key={layer.key}
              onClick={() =>
                setLayers((prev) => ({ ...prev, [layer.key]: !prev[layer.key] }))
              }
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all",
                layers[layer.key]
                  ? "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 text-emerald-800 dark:text-emerald-400"
                  : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", layer.color)} />
              {layer.label}
              <span className="text-3xs">{layers[layer.key] ? "ON" : "OFF"}</span>
            </button>
          ))}

          {canViewFootprints && layers.footprints && (
            <select
              className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
              value={collectorFilter}
              onChange={(e) => setCollectorFilter(e.target.value)}
            >
              <option value="all">👣 All Registrars</option>
              {(collectorsData?.collectors ?? []).map((c) => (
                <option key={c.id} value={c.user_id}>
                  {`${c.user?.first_name ?? ""} ${c.user?.last_name ?? ""}`.trim() ||
                    c.user_id.slice(0, 8)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Map + legend */}
      <div
        className={cn(
          "rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xl bg-white dark:bg-slate-800 relative",
          fullScreen ? "h-[calc(100vh-260px)]" : "h-[calc(100vh-380px)] min-h-[420px]",
        )}
      >
        <GoogleMapContainer
          filters={filters}
          layers={layers}
          focusRouteId={focusRouteId}
          selectedCollectorId={canViewFootprints ? collectorFilter : null}
        />

        {/* Legend overlay */}
        <div className="absolute bottom-4 left-4 z-40 bg-white/95 dark:bg-slate-800/95 backdrop-blur rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-3 space-y-1.5">
          <div className="text-3xs font-black uppercase tracking-widest text-slate-400">
            Legend
          </div>
          <div className="flex items-center gap-2 text-2xs font-semibold text-slate-600 dark:text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Facility (by status)
          </div>
          <div className="flex items-center gap-2 text-2xs font-semibold text-slate-600 dark:text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-500" /> IBP Business
          </div>
          <div className="flex items-center gap-2 text-2xs font-semibold text-slate-600 dark:text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Outdoor Route
          </div>
          <div className="flex items-center gap-2 text-2xs font-semibold text-slate-600 dark:text-slate-300">
            <span className="flex gap-0.5">
              <span className="h-1 w-1.5 rounded bg-orange-400" />
              <span className="h-1 w-1.5 rounded bg-violet-500" />
              <span className="h-1 w-1.5 rounded bg-emerald-500" />
            </span>
            Registrar Trail (colored per registrar — hover for name)
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapViewTab;
