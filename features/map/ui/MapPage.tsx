"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useHasPermission } from "@/stores/permission-context";
import { useMapStats } from "@/features/map/data/useMap";
import MapViewTab from "./MapViewTab";
import FootprintTab from "./FootprintTab";
import CoverageTab from "./CoverageTab";
import CollectorsTab from "./CollectorsTab";

const MAP_TABS = [
  { id: "map-view", label: "Map View", icon: "🗺️" },
  { id: "footprints", label: "Footprint Tracker", icon: "👣" },
  { id: "coverage", label: "Coverage Report", icon: "📊" },
  { id: "collectors", label: "Collectors", icon: "👷" },
];

const MapPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "map-view");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Collector GPS / footprint data is staff PII — hidden without users.view (F-D6).
  const canViewFootprints = useHasPermission("users.view");
  const canExport = useHasPermission("map.export");

  const { data: stats, isLoading, isError, error: statsError } = useMapStats();

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) setActiveTab(tabParam);
  }, [tabParam]);

  useEffect(() => {
    if (isError) {
      toast.error(statsError?.message || "Failed to load map KPIs.");
    }
  }, [isError, statsError]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(value === "map-view" ? "/map" : `/map?tab=${value}`, {
      scroll: false,
    });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/map/export");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Export failed.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `map-facilities-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Map data exported");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const visibleTabs = MAP_TABS.filter(
    (tab) =>
      canViewFootprints || (tab.id !== "footprints" && tab.id !== "collectors"),
  );

  return (
    <div
      className={cn(
        "animate-in fade-in duration-500 space-y-4",
        isFullScreen
          ? "fixed inset-0 z-50 bg-white dark:bg-slate-800 p-4 overflow-y-auto"
          : "flex flex-col",
      )}
    >
      <PageHeader
        title="🗺️ Global Health Map"
        subtitle="Geographic coverage · Facility distribution · Footprints · Outdoor routes"
      >
        {canExport && (
          <button
            className="btn btn-secondary"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? "⏳ Exporting…" : "📥 Export Map Data"}
          </button>
        )}
        <button
          className="btn btn-secondary"
          onClick={() => setIsFullScreen((v) => !v)}
        >
          {isFullScreen ? "🔳 Exit Full Screen" : "🔍 Full Screen"}
        </button>
        <Link href="/facilities" className="btn btn-primary">
          🏥 View Facilities
        </Link>
      </PageHeader>

      {/*
        /api/map/stats is a point-in-time rollup (facility_profile /
        collector counts and a district-coverage ratio computed fresh on
        every call) — nothing here has retained history, so no card gets a
        trend. Facilities Plotted (registry scale) and Coverage (% of
        Ghana's districts reached — the number that drives where to send
        collectors next) are the two an admin reads this page for and stay
        at default size; IBPs on Map, Active Collectors and Footprint
        Points are supporting detail and go small. (Footprint Tracker's
        dated rows are fetched by a separate, filtered, paginated query
        inside FootprintTab only when that tab is opened — not already
        loaded here for this KPI row — so deriving a trend from them would
        mean adding a new query, which isn't justified for a page where
        the coverage percentage is already the more decision-relevant
        number.)
      */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        <KpiCard
          icon="🏥"
          label="Facilities Plotted"
          value={(stats?.facilities_plotted ?? 0).toLocaleString()}
          variant="green"
          delta={`${stats?.regions_covered ?? 0} regions`}
          isLoading={isLoading}
          isError={isError}
        />
        <KpiCard
          icon="🏪"
          label="IBPs on Map"
          value={(stats?.ibps_on_map ?? 0).toLocaleString()}
          variant="purple"
          delta="Geo-tagged businesses"
          size="sm"
          isLoading={isLoading}
          isError={isError}
        />
        <KpiCard
          icon="👷"
          label="Active Collectors"
          value={(stats?.active_collectors ?? 0).toLocaleString()}
          variant="blue"
          delta="GPS tracked"
          size="sm"
          isLoading={isLoading}
          isError={isError}
        />
        <KpiCard
          icon="📡"
          label="Coverage"
          value={`${stats?.coverage_percent ?? 0}%`}
          variant={
            (stats?.coverage_percent ?? 0) >= 50 ? "green" : "orange"
          }
          delta={`${100 - (stats?.coverage_percent ?? 0)}% uncovered`}
          isLoading={isLoading}
          isError={isError}
        />
        <KpiCard
          icon="👣"
          label="Footprint Points"
          value={(stats?.footprint_points ?? 0).toLocaleString()}
          variant="teal"
          delta={`+${stats?.footprint_points_today ?? 0} today`}
          size="sm"
          isLoading={isLoading}
          isError={isError}
        />
      </div>

      <Tabs value={activeTab} className="w-full min-w-0" onValueChange={handleTabChange}>
        <div className="border-b border-slate-200 dark:border-slate-700 mb-2 w-full overflow-hidden">
          <TabsList
            className="bg-transparent h-auto p-0 flex flex-nowrap gap-0 justify-start w-full overflow-x-auto overflow-y-hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
          >
            {visibleTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "shrink-0 whitespace-nowrap px-4 sm:px-5 py-2.5 sm:py-3",
                  "text-2xs sm:text-xs font-black uppercase tracking-widest",
                  "text-slate-400 border-b-2 border-transparent",
                  "transition-all rounded-none outline-none cursor-pointer",
                  "hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/15/40",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  "data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-700 dark:data-[state=active]:border-emerald-400",
                )}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="map-view" className="outline-none w-full min-w-0">
          <MapViewTab fullScreen={isFullScreen} />
        </TabsContent>
        <TabsContent value="footprints" className="outline-none w-full min-w-0">
          {canViewFootprints && <FootprintTab />}
        </TabsContent>
        <TabsContent value="coverage" className="outline-none w-full min-w-0">
          <CoverageTab />
        </TabsContent>
        <TabsContent value="collectors" className="outline-none w-full min-w-0">
          {canViewFootprints && <CollectorsTab />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MapPage;
