"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import DataTable from "@/components/redesign/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useAddConditionDialog,
  useViewConditionDialog,
} from "@/stores/dialog-store";
import AddSymptomDialog from "./_components/add-symptom-dialog";
import ViewSymptomDialog from "./_components/view-symptom-dialog";
import { symptomsColumns } from "@/components/Data-Table/columns/symptomsColumns";
import {
  useSymptoms,
  useSymptomStats,
} from "@/hooks/supabase-calls/useSymptoms";
import { cn } from "@/lib/utils";

const SymptomsPage = () => {
  const addSymptom = useAddConditionDialog();
  const viewSymptom = useViewConditionDialog();

  const limit = 10;
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [activeTab, setActiveTab] = useState("all");

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading } = useSymptoms({
    limit,
    page,
    search: debouncedSearch,
  });

  const { data: stats, isLoading: isStatsLoading } = useSymptomStats();

  const onRowClick = useCallback(
    (condition: any) => viewSymptom.open(condition.id),
    [viewSymptom.open],
  );

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="🩺 Symptoms Management"
        subtitle="Independent symptoms database · Conditions mapping · Adherence insights"
      >
        <button className="btn btn-secondary btn-sm font-bold">📥 Export CSV</button>
        <button className="btn btn-primary btn-sm text-white font-black uppercase tracking-widest text-[9px]" onClick={() => addSymptom.open()}>
          + Add Symptom
        </button>
      </PageHeader>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 mb-5">
        <KpiCard 
          icon="📊" 
          label="Total Symptoms" 
          value={isStatsLoading ? "..." : (stats?.totalSymptoms || 0).toString()} 
          variant="blue" 
          delta="+8.4% month" 
          deltaType="up" 
        />
        <KpiCard 
          icon="📂" 
          label="Categories" 
          value={isStatsLoading ? "..." : (stats?.totalCategories || 0).toString()} 
          variant="purple" 
          delta="Well organized" 
        />
        <KpiCard 
          icon="🩺" 
          label="Systemic Count" 
          value={isStatsLoading ? "..." : String(stats?.systemicCount ?? "N/A")} 
          variant="teal" 
          delta="Indexed" 
        />
        <KpiCard 
          icon="✅" 
          label="Verification Rate" 
          value="94%" 
          variant="green" 
          delta="High accuracy" 
          deltaType="up" 
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent h-auto p-0 flex gap-0 border-b border-slate-200 w-full justify-start rounded-none overflow-x-auto no-scrollbar">
          {[
            { id: "all", label: "All Symptoms", icon: "🩺" },
            { id: "categories", label: "Categories", icon: "📂" },
            { id: "analytics", label: "Analytics", icon: "📊" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "px-5 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400 border-b-2 border-transparent transition-all rounded-none outline-none",
                "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-ek-green-dark data-[state=active]:border-ek-green-dark"
              )}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="outline-none mt-4">
          <div className="flex flex-wrap gap-2 items-center mb-4">
            <div className="relative flex-1 min-w-[240px]">
              <input 
                className="w-full h-8 pl-3 pr-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none transition-all" 
                placeholder="🔍 Search symptoms by name, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-bold bg-white outline-none focus:ring-2 focus:ring-ek-green/20">
              <option>All Categories</option>
            </select>
            <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-bold bg-white outline-none focus:ring-2 focus:ring-ek-green/20">
              <option>All Status</option>
            </select>
            <button className="btn btn-secondary btn-sm font-bold text-[10px]">📥 Export</button>
          </div>

          <div className="card p-0 overflow-hidden border border-slate-200 shadow-sm rounded-xl">
            <DataTable
              columns={symptomsColumns as any}
              data={data?.symptoms || []}
              selectable
            />
          </div>

          <div className="flex gap-2 mt-4">
            <button className="btn btn-secondary btn-sm font-bold text-[10px]">✅ Verify Selected</button>
            <button className="btn btn-danger btn-sm font-bold text-[10px]">🗑️ Delete Selected</button>
          </div>
        </TabsContent>

        {["categories", "analytics"].map((tabId) => (
          <TabsContent key={tabId} value={tabId} className="outline-none mt-4">
            <div className="card py-20 text-center border border-slate-200 shadow-sm rounded-xl">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto text-2xl">
                  {tabId === 'categories' ? '📂' : '📊'}
                </div>
                <h3 className="text-lg font-black text-slate-800 capitalize">{tabId} View</h3>
                <p className="text-xs text-slate-500 font-medium">This module is currently being optimized for high-fidelity data visualization.</p>
                <div className="flex justify-center gap-2">
                   <span className="badge badge-amber uppercase">Coming Soon</span>
                </div>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <AddSymptomDialog />
      <ViewSymptomDialog />
    </div>
  );
};

export default SymptomsPage;
