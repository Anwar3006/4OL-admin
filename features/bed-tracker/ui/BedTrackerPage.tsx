"use client";

/**
 * BedTracker (PKM) page — Gap Analysis Part L Phase 4 rebuild.
 * Replaces the read-only OperationsModuleDashboard shell with working
 * tabs over the RBAC-guarded /api/bedtracker routes (L1/L11 fixed).
 */

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Ambulance,
  Bed,
  Building2,
  CheckCircle2,
  Gauge,
} from "lucide-react";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  useBedTrackerOverview,
  type BedTrackerOverview,
} from "@/features/bed-tracker/data/useBedTracker";
import LiveOverviewTab from "./LiveOverviewTab";
import BedRegistryTab from "./BedRegistryTab";
import BedTrackerFacilitiesTab from "./BedTrackerFacilitiesTab";
import AmbulanceDispatchTab from "./AmbulanceDispatchTab";
import BedTrackerAnalyticsTab from "./BedTrackerAnalyticsTab";
import DesignStrategyTab from "./DesignStrategyTab";
import { RegisterFacilityDialog } from "./register-facility-dialog";
import { EmergencyDispatchDialog } from "./emergency-dispatch-dialog";
import type { BedTrackerTabProps } from "@/features/bed-tracker/schema/types";

// Re-exported: the tabs used to import this from the page module itself.
export type { BedTrackerTabProps };

const TABS = [
  { id: "overview", label: "🟢 Live Overview" },
  { id: "registry", label: "🛏️ Bed Registry" },
  { id: "facilities", label: "🏥 Facilities" },
  { id: "dispatch", label: "🚑 Ambulance Dispatch" },
  { id: "analytics", label: "📊 Analytics" },
  { id: "strategy", label: "💼 Design & Strategy" },
];

export default function BedTrackerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "overview");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useBedTrackerOverview();

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) setActiveTab(tabParam);
  }, [tabParam, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(value === "overview" ? "/bedtracker" : `/bedtracker?tab=${value}`, {
      scroll: false,
    });
  };

  const metrics = data?.metrics;
  const tabProps: BedTrackerTabProps = { data, loading: isLoading };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="BedTracker (PKM)"
        subtitle="Live bed availability, emergency routing, and ambulance dispatch"
      >
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? "Refreshing..." : "Refresh"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setRegisterOpen(true)}>
          + Add Facility
        </Button>
        <Button type="button" size="sm" className="bg-red-600 text-white hover:bg-red-700" onClick={() => setDispatchOpen(true)}>
          🚨 Emergency Dispatch
        </Button>
      </PageHeader>

      {isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Module data unavailable</AlertTitle>
          <AlertDescription>{error?.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard icon={<Building2 className="h-5 w-5" />} label="Facilities Online" value={isLoading ? "..." : `${metrics?.facilitiesOnline ?? 0}/${metrics?.trackedFacilities ?? 0}`} variant="blue" delta="Tracked facilities" deltaType="neutral" />
        <KpiCard icon={<Bed className="h-5 w-5" />} label="Total Beds" value={isLoading ? "..." : String(metrics?.totalBeds ?? 0)} variant="purple" delta={`${metrics?.availableBeds ?? 0} available`} deltaType="up" />
        <KpiCard icon={<Gauge className="h-5 w-5" />} label="Occupancy" value={isLoading ? "..." : `${metrics?.occupancyPct ?? 0}%`} variant="amber" delta="Across tracked wards" deltaType="neutral" />
        <KpiCard icon={<AlertTriangle className="h-5 w-5" />} label="Critical Wards" value={isLoading ? "..." : String(metrics?.criticalWards ?? 0)} variant="red" delta="Zero beds left" deltaType="down" />
        <KpiCard icon={<Ambulance className="h-5 w-5" />} label="Ambulances" value={isLoading ? "..." : String(metrics?.ambulances ?? 0)} variant="green" delta={`${metrics?.ambulancesActive ?? 0} active`} deltaType="neutral" />
        <KpiCard icon={<CheckCircle2 className="h-5 w-5" />} label="Active Alerts" value={isLoading ? "..." : String(metrics?.activeAlerts ?? 0)} variant="red" delta={`${metrics?.activeDispatches ?? 0} open dispatches`} deltaType="neutral" />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-transparent border-b border-slate-200 h-auto p-0 flex gap-0 mb-4 justify-start overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "px-5 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400 border-b-2 border-transparent transition-all rounded-none outline-none",
                "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-ek-green-dark data-[state=active]:border-ek-green-dark",
              )}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="animate-in slide-in-from-bottom-2 duration-300">
          <TabsContent className="w-full min-w-0 outline-none" value="overview"><LiveOverviewTab {...tabProps} /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="registry"><BedRegistryTab {...tabProps} /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="facilities"><BedTrackerFacilitiesTab {...tabProps} onRegister={() => setRegisterOpen(true)} /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="dispatch"><AmbulanceDispatchTab {...tabProps} onDispatch={() => setDispatchOpen(true)} /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="analytics"><BedTrackerAnalyticsTab {...tabProps} /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="strategy"><DesignStrategyTab /></TabsContent>
        </div>
      </Tabs>

      <RegisterFacilityDialog open={registerOpen} onOpenChange={setRegisterOpen} />
      <EmergencyDispatchDialog open={dispatchOpen} onOpenChange={setDispatchOpen} fleet={data?.fleet ?? []} />
    </div>
  );
}
