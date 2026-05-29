"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import DataTable from "@/components/redesign/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useAddHealthyLivingDialog,
  useViewHealthyLivingDialog,
} from "@/stores/dialog-store";
import { healthyLivingColumns } from "@/components/Data-Table/columns/healthyLivingColumns";
import AddHealthyLivingDialog from "./_components/add-healthyLiving-dialog";
import { useHealthyLivings } from "@/hooks/supabase-calls/useHealthyLiving";
import ViewHealthyLivingDialog from "./_components/view-healthyLiving-dialog";
import { cn } from "@/lib/utils";

const HealthyLivingPage = () => {
  const addHealthLiving = useAddHealthyLivingDialog();
  const viewHealthyLiving = useViewHealthyLivingDialog();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;
  const [activeTab, setActiveTab] = useState("all");

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading } = useHealthyLivings({
    page,
    limit,
    search: debouncedSearch,
  });

  const onRowClick = useCallback(
    (data: any) => viewHealthyLiving.open(data.id),
    [viewHealthyLiving],
  );

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="🥗 Healthy Living"
        subtitle="Public health knowledge base · Lifestyle guidance · Wellness content"
      >
        <button className="btn btn-secondary btn-sm font-bold">📥 Export CSV</button>
        <button className="btn btn-primary btn-sm text-white font-black uppercase tracking-widest text-[9px]" onClick={() => addHealthLiving.open()}>
          + Add Article
        </button>
      </PageHeader>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard 
          icon="📊" 
          label="Total Articles" 
          value={isLoading ? "..." : (data?.meta?.total || 0).toString()} 
          variant="blue" 
          delta="+4 this month" 
          deltaType="up" 
        />
        <KpiCard 
          icon="📂" 
          label="Categories" 
          value="12" 
          variant="purple" 
          delta="Well organized" 
        />
        <KpiCard 
          icon="👁️" 
          label="Total Views" 
          value="48K" 
          variant="teal" 
          delta="+12.4%" 
          deltaType="up" 
        />
        <KpiCard 
          icon="✅" 
          label="Avg Rating" 
          value="4.8" 
          variant="green" 
          delta="High helpfulness" 
          deltaType="up" 
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent h-auto p-0 flex gap-0 border-b border-slate-200 w-full justify-start rounded-none overflow-x-auto no-scrollbar">
          {[
            { id: "all", label: "All Content", icon: "🥗" },
            { id: "categories", label: "Categories", icon: "📂" },
            { id: "engagement", label: "Analytics", icon: "📊" },
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
                placeholder="🔍 Search articles by title, topic..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-bold bg-white outline-none focus:ring-2 focus:ring-ek-green/20">
              <option>All Topics</option>
            </select>
            <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-bold bg-white outline-none focus:ring-2 focus:ring-ek-green/20">
              <option>All Status</option>
            </select>
            <button className="btn btn-secondary btn-sm font-bold text-[10px]">📥 Export</button>
          </div>

          <div className="card p-0 overflow-hidden border border-slate-200 shadow-sm rounded-xl">
            <DataTable
              columns={healthyLivingColumns as any}
              data={data?.healthyLivings || []}
              selectable
            />
          </div>

          <div className="flex gap-2 mt-4">
            <button className="btn btn-secondary btn-sm font-bold text-[10px]">✅ Publish Selected</button>
            <button className="btn btn-danger btn-sm font-bold text-[10px]">🗑️ Delete Selected</button>
          </div>
        </TabsContent>

        {["categories", "engagement"].map((tabId) => (
          <TabsContent key={tabId} value={tabId} className="outline-none mt-4">
            <div className="card py-20 text-center border border-slate-200 shadow-sm rounded-xl">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto text-2xl">
                  {tabId === 'categories' ? '📂' : '📊'}
                </div>
                <h3 className="text-lg font-black text-slate-800 capitalize">{tabId} View</h3>
                <p className="text-xs text-slate-500 font-medium">This module is currently being optimized for wellness data analytics.</p>
                <div className="flex justify-center gap-2">
                   <span className="badge badge-amber uppercase">Coming Soon</span>
                </div>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <AddHealthyLivingDialog />
      <ViewHealthyLivingDialog />
    </div>
  );
};

export default HealthyLivingPage;
