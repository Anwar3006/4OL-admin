"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { TOP_RATED_MODULES } from "@/schemas/top-rated.schema";
import TopRatedItemsTable from "./_components/TopRatedItemsTable";
import AddTopRatedItemDialog from "./_components/AddTopRatedItemDialog";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase";
import { downloadCsv } from "@/lib/csv-export";
import {
  fetchTopRatedItemsForExport,
  getTopRatedWindowStatus,
} from "@/hooks/supabase-calls/useTopRatedItems";
import { toast } from "sonner";
import { useAddTopRatedItemDialog } from "@/stores/dialog-store";

const TopRatedTabs = [
  { id: "all", label: "🏆 All Items" },
  ...TOP_RATED_MODULES.map((m) => ({
    id: m,
    label: `${getModuleIcon(m)} ${formatModuleName(m)}`,
  })),
];

function getModuleIcon(module: string): string {
  const icons: Record<string, string> = {
    facility: "🏥",
    outdoor_route: "🗺️",
    outdoor_event: "📅",
    challenge: "🏆",
    exercise: "🏋️",
    fitness_plan: "📋",
  };
  return icons[module] || "📦";
}

function formatModuleName(module: string): string {
  return module.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

const TopRatedPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "all");
  const [isExporting, setIsExporting] = useState(false);
  const { open: openAddDialog } = useAddTopRatedItemDialog();

  // Gap Analysis T-D4 — one select instead of one count query per module.
  const { data: moduleCounts } = useQuery({
    queryKey: ["top-rated-module-counts"],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("top_rated_items")
        .select("module")
        .limit(1000);

      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of data || []) {
        counts[row.module] = (counts[row.module] || 0) + 1;
      }
      return counts;
    },
  });

  const totalItems = Object.values(moduleCounts || {}).reduce(
    (sum, count) => sum + count,
    0,
  );

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const items = await fetchTopRatedItemsForExport(
        activeTab === "all" ? undefined : activeTab,
      );
      if (!items.length) {
        toast.error("No top-rated items to export");
        return;
      }
      downloadCsv(
        items.map((item) => ({
          module: item.module,
          title: item.title,
          subtitle: item.subtitle,
          rating: item.rating,
          rating_count: item.rating_count,
          source: item.source,
          rank: item.rank,
          status: getTopRatedWindowStatus(item),
          publish_from: item.publish_from || "",
          expire_at: item.expire_at || "",
          added_at: item.added_at
            ? new Date(item.added_at).toISOString()
            : "",
        })),
        `top-rated-items-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch (err: any) {
      toast.error(`Export failed: ${err?.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/top-rated?tab=${value}`, { scroll: false });
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="🏆 Top Rated Curation"
        subtitle="Manage top-rated items across all modules - manually curated or subscription-driven"
      >
        <button
          className="btn btn-secondary btn-sm disabled:opacity-50"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? "⏳ Exporting..." : "📋 Export List"}
        </button>
        <button
          className="btn btn-primary text-white font-black uppercase tracking-widest text-[9px]"
          onClick={openAddDialog}
        >
          + Add Item
        </button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-2xl font-bold text-slate-800">{totalItems}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Total Items
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-2xl font-bold text-slate-800">
            {moduleCounts?.facility || 0}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Facilities
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-2xl font-bold text-slate-800">
            {moduleCounts?.fitness_plan || 0}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Fitness Plans
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-2xl font-bold text-slate-800">
            {moduleCounts?.outdoor_route || 0}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Outdoor Routes
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-2xl font-bold text-slate-800">
            {moduleCounts?.outdoor_event || 0}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Outdoor Events
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-2xl font-bold text-slate-800">
            {moduleCounts?.challenge || 0}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Challenges
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-2xl font-bold text-slate-800">
            {moduleCounts?.exercise || 0}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Exercises
          </div>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <div className="border-b border-slate-200 mb-5 w-full overflow-hidden">
          <TabsList
            className="bg-transparent h-auto p-0 flex flex-nowrap gap-0 justify-start w-full overflow-x-auto overflow-y-hidden"
            style={
              {
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              } as React.CSSProperties
            }
          >
            {TopRatedTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "shrink-0 whitespace-nowrap px-4 sm:px-5 py-2.5 sm:py-3",
                  "text-[10px] sm:text-[11px] font-black uppercase tracking-widest",
                  "text-slate-400 border-b-2 border-transparent",
                  "transition-all rounded-none outline-none cursor-pointer",
                  "hover:text-emerald-700 hover:bg-emerald-50/40",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  "data-[state=active]:text-emerald-700 data-[state=active]:border-emerald-700",
                )}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="animate-in slide-in-from-bottom-2 duration-300">
          <TabsContent className="w-full min-w-0 outline-none" value="all">
            <TopRatedItemsTable module={undefined} />
          </TabsContent>
          {TOP_RATED_MODULES.map((module) => (
            <TabsContent className="w-full min-w-0 outline-none" key={module} value={module}>
              <TopRatedItemsTable module={module} />
            </TabsContent>
          ))}
        </div>
      </Tabs>
      <AddTopRatedItemDialog />
    </div>
  );
};

export default TopRatedPage;
