"use client";

import React, { useState } from "react";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import DataTable from "@/components/redesign/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useConditions, useDeleteCondition } from "@/hooks/supabase-calls/useCondition";

import AddConditionDialog from "./_components/add-condition-dialog";
import { useAddConditionDialog } from "@/stores/dialog-store";


const DiseasesPage = () => {
  const addCondition = useAddConditionDialog();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const limit = 10;
  const [page, setPage] = useState(1);

    const { data, isLoading, isFetching } = useConditions({
    params: { page, limit, search },
    enabled: true,
  });

  const { mutate: deleteCondition } = useDeleteCondition();

  const columns = [
    {
      key: "name",
      label: "Condition",
      render: (val: string, row: any) => (
        <div>
          <div className="font-bold text-slate-800">{val}</div>
          <div className="text-[10px] text-slate-400 max-w-[200px] truncate">{row.description || "No description provided"}</div>
        </div>
      )
    },
    {
      key: "icd_11",
      label: "ICD-11",
      render: (val: string) => <span className="td-m">{val || "BA80"}</span>
    },
    {
      key: "category",
      label: "Category",
      render: (val: string) => <span className="badge badge-blue">{val || "Cardiovascular"}</span>
    },
    {
      key: "body_parts",
      label: "Body Parts",
      render: (val: string[]) => <span className="text-[11px] text-slate-600">{(val || ["Heart", "Kidneys"]).join(", ")}</span>
    },
    {
      key: "specialists",
      label: "Specialists",
      render: (val: string[]) => <span className="text-[11px] text-slate-600">{(val || ["Cardiologist"]).join(", ")}</span>
    },
    {
      key: "likes",
      label: "📋 Likes",
      render: (val: number) => <span className="font-bold text-ek-red text-[11px]">{val?.toLocaleString() || "8,420"}</span>
    },
    {
      key: "saves",
      label: "📋 Saves",
      render: (val: number) => <span className="font-bold text-ek-gold text-[11px]">{val?.toLocaleString() || "5,120"}</span>
    },
    {
      key: "carousel",
      label: "Carousel",
      render: (val: boolean) => (
        <span className={cn("badge", val ? "badge-green" : "badge-secondary")}>
          {val ? "⭐ Featured" : "Not Featured"}
        </span>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (val: string) => (
        <span className={cn("badge", val === 'published' ? "badge-green" : "badge-amber")}>
          {val || "Published"}
        </span>
      )
    }
  ];

  const rowActions = [
    { label: "View", icon: "👁️", onClick: () => {} },
    { label: "Edit", icon: "✏️", onClick: (row: any) => addCondition.open(row) },
    { label: "Feature", icon: "⭐", onClick: () => {} },
    { label: "Delete", icon: "🗑️", onClick: (row: any) => deleteCondition(row.id), danger: true },
  ];

  return (
    <div className="animate-in fade-in duration-500">
      <PageHeader
        title="🦠 Diseases & Conditions"
        subtitle="Health content database · ICD-11 indexed · 847 conditions · Managed by Content Manager"
      >
        <button className="btn btn-secondary">📥 Export CSV</button>
        <button className="btn btn-secondary">🎠 Carousel Features</button>
        <button className="btn btn-primary" onClick={() => addCondition.open()}>+ Add Condition</button>
      </PageHeader>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-5">
        <KpiCard icon="📊" label="Total Conditions" value="847" variant="blue" delta="+12 month" deltaType="up" />
        <KpiCard icon="📂" label="Categories" value="34" variant="purple" delta="Well organised" />
        <KpiCard icon="🚩" label="Total Likes" value="124K" variant="red" delta="+8.4% month" deltaType="up" />
        <KpiCard icon="⏳" label="Total Saves" value="89K" variant="gold" delta="+11.2%" deltaType="up" />
        <KpiCard icon="📊" label="Carousel Features" value="12" variant="teal" delta="Active slots" />
        <KpiCard icon="✅" label="Avg Engagement" value="4.7" variant="green" delta="High interest" deltaType="up" />
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <div className="tabs mb-4 overflow-x-auto no-scrollbar">
          <TabsList className="bg-transparent h-auto p-0 flex gap-0">
            {[
              { id: "all", label: "All Conditions", icon: "🦠" },
              { id: "carousel", label: "Carousel Features", icon: "🎠" },
              { id: "engagement", label: "Engagement Analytics", icon: "📊" },
              { id: "linkages", label: "Page Linkages", icon: "🔗" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="tab transition-all duration-150 data-[state=active]:active data-[state=active]:text-ek-green-dark data-[state=active]:border-b-3 data-[state=active]:border-ek-green-dark"
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="all" className="outline-none">
          <div className="card mb-4">
            <div className="fbar p-0 m-0">
              <div className="relative flex-1 min-w-[240px]">
                <input 
                  className="fi fi-s w-full pl-8" 
                  placeholder="🔍 Search by name, ICD code, category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select className="fi"><option>All Categories</option></select>
              <select className="fi"><option>All Status</option></select>
              <select className="fi"><option>Carousel: All</option></select>
              <button className="btn btn-secondary">📥 Export</button>
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <DataTable
              columns={columns}
              data={data?.diseases || []}
              rowActions={rowActions}
              selectable
              itemsPerPage={limit}
              // isLoading={isLoading || isFetching}
            />
          </div>

          <div className="flex gap-2 mt-4">
            <button className="btn btn-secondary text-[11px] font-bold">📥 Export</button>
            <button className="btn btn-secondary text-[11px] font-bold">⭐ Feature Selected</button>
            <button className="btn btn-secondary text-[11px] font-bold">✅ Publish</button>
            <button className="btn btn-danger text-[11px] font-bold">🗑️ Delete</button>
          </div>
        </TabsContent>

        {["carousel", "engagement", "linkages"].map((tabId) => (
          <TabsContent key={tabId} value={tabId} className="outline-none">
            <div className="card py-20 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto text-2xl">
                  {tabId === 'carousel' ? '🎠' : tabId === 'engagement' ? '📊' : '🔗'}
                </div>
                <h3 className="text-lg font-black text-slate-800 capitalize">{tabId} Analytics</h3>
                <p className="text-xs text-slate-500 font-medium">This module is currently being optimized for high-fidelity data visualization.</p>
                <div className="flex justify-center gap-2">
                   <span className="badge badge-amber uppercase">Coming Soon</span>
                </div>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <AddConditionDialog />
    </div>
  );
};

export default DiseasesPage;
