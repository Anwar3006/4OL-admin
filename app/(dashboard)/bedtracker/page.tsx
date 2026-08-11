"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import LiveOverviewTab from "./_components/LiveOverviewTab";
import BedRegistryTab from "./_components/BedRegistryTab";
import BedTrackerFacilitiesTab from "./_components/BedTrackerFacilitiesTab";
import AmbulanceDispatchTab from "./_components/AmbulanceDispatchTab";
import BedTrackerAnalyticsTab from "./_components/BedTrackerAnalyticsTab";
import DesignStrategyTab from "./_components/DesignStrategyTab";

const TabsConfig = [
  { id: "overview", label: "🛏️ Live Overview" },
  { id: "registry", label: "📋 Bed Registry" },
  { id: "facilities", label: "🏥 Facilities" },
  { id: "dispatch", label: "🚑 Ambulance Dispatch" },
  { id: "analytics", label: "📊 Analytics" },
  { id: "strategy", label: "🗂️ Design & Strategy" },
];

export default function BedTrackerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "overview");

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(
      value === "overview" ? "/bedtracker" : `/bedtracker?tab=${value}`,
      { scroll: false },
    );
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="🛏️ BedTracker (PKM)"
        subtitle="Live bed availability · Emergency routing · Ambulance dispatch"
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-transparent border-b border-slate-200 h-auto p-0 flex gap-0 mb-4 justify-start overflow-x-auto no-scrollbar">
          {TabsConfig.map((tab) => (
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
          <TabsContent className="w-full min-w-0 outline-none" value="overview">
            <LiveOverviewTab />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="registry">
            <BedRegistryTab />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="facilities">
            <BedTrackerFacilitiesTab />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="dispatch">
            <AmbulanceDispatchTab />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="analytics">
            <BedTrackerAnalyticsTab />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="strategy">
            <DesignStrategyTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
