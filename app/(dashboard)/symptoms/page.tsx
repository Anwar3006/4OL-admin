"use client";

import React, { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { DataTable } from "@/components/Data-Table/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useAddConditionDialog,
  useViewConditionDialog,
} from "@/stores/dialog-store";
import AddSymptomDialog from "./_components/add-symptom-dialog";
import ViewSymptomDialog from "./_components/view-symptom-dialog";
import {
  useSymptoms,
  useSymptomStats,
} from "@/hooks/supabase-calls/useSymptoms";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";

const SymptomsPage = () => {
  const addSymptom = useAddConditionDialog();
  const { open: openViewDialog } = useViewConditionDialog();

  const limit = 10;
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [activeTab, setActiveTab] = useState("all");
  const searchParams = useSearchParams();

  // Read page from URL to trigger refetch when pagination changes
  const page = parseInt(searchParams.get("sym_page") || "1", 10);

  const { data, isLoading, isFetching } = useSymptoms({
    limit,
    page,
    search: debouncedSearch,
  });

  const { data: stats, isLoading: isStatsLoading } = useSymptomStats();

  const columns = [
    {
      accessorKey: "name",
      header: "Symptom Name",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-black text-xs text-slate-500 shrink-0 uppercase border border-slate-200 shadow-sm">
            {row.original.name?.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-800 truncate">
              {row.original.name}
            </div>
            <div className="text-[10px] text-slate-400 max-w-[200px] truncate leading-tight mt-0.5">
              {row.original.description || "No description provided"}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "bodyParts",
      header: "Body Parts",
      cell: ({ row }: any) => (
        <div className="flex flex-wrap gap-1">
          {(row.original.bodyParts || []).length > 0 ? (
            row.original.bodyParts.slice(0, 3).map((bp: string, i: number) => (
              <span
                key={i}
                className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded font-bold border border-slate-100"
              >
                {bp}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-slate-300 italic">—</span>
          )}
          {row.original.bodyParts?.length > 3 && (
            <span className="text-[9px] text-slate-400 font-bold">
              +{row.original.bodyParts.length - 3} more
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "categories",
      header: "Categories",
      cell: ({ row }: any) => (
        <div className="flex flex-wrap gap-1">
          {(row.original.categories || ["General"])
            .slice(0, 2)
            .map((cat: string, i: number) => (
              <span key={i} className="badge badge-blue">
                {cat}
              </span>
            ))}
        </div>
      ),
    },
    {
      accessorKey: "specialist",
      header: "Specialist",
      cell: ({ row }: any) => (
        <span className="badge badge-purple font-bold">
          {row.original.specialist || "General"}
        </span>
      ),
    },
    {
      accessorKey: "updated_at",
      header: "Last Edited",
      cell: ({ row }: any) => (
        <div className="text-[10px] text-slate-500 font-medium">
          {row.original.updated_at
            ? format(new Date(row.original.updated_at), "MMM dd, yyyy")
            : "—"}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => (
        <span
          className={cn(
            "badge",
            row.original.status === "verified" ? "badge-green" : "badge-amber",
          )}
        >
          {row.original.status === "verified" ? "✅ Verified" : "⏳ Pending"}
        </span>
      ),
    },
  ];

  const rowActions = [
    {
      label: "View",
      icon: "👁️",
      onClick: (row: any) => openViewDialog(row.id),
    },
    {
      label: "Edit",
      icon: "✏️",
      onClick: (row: any) => addSymptom.open(row),
    },
    {
      label: "Delete",
      icon: "🗑️",
      onClick: (row: any) => console.log("Delete", row.id),
      danger: true,
    },
  ];

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="🩺 Symptoms Management"
        subtitle="Independent symptoms database · Conditions mapping · Adherence insights"
      >
        <button className="btn btn-secondary">📥 Export CSV</button>
        <button className="btn btn-primary" onClick={() => addSymptom.open()}>
          + Add Symptom
        </button>
      </PageHeader>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        <KpiCard
          icon="📊"
          label="Total Symptoms"
          value={
            isStatsLoading
              ? "..."
              : (stats?.totalSymptoms || 0).toLocaleString()
          }
          variant="blue"
          delta="+8.4% month"
          deltaType="up"
        />
        <KpiCard
          icon="📂"
          label="Categories"
          value={
            isStatsLoading
              ? "..."
              : (stats?.totalCategories || 0).toLocaleString()
          }
          variant="purple"
          delta="Well organized"
        />
        <KpiCard
          icon="🩺"
          label="Systemic Count"
          value={isStatsLoading ? "..." : String(stats?.systemicCount ?? "0")}
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
            {[
              { id: "all", label: "All Symptoms", icon: "🩺" },
              { id: "categories", label: "Categories", icon: "📂" },
              { id: "analytics", label: "Analytics", icon: "📊" },
            ].map((tab) => (
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
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="mt-6">
          <TabsContent
            value="all"
            className="outline-none space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[300px]">
                <input
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 text-xs focus:ring-4 focus:ring-ek-green/10 focus:border-ek-green outline-none transition-all"
                  placeholder="🔍 Search symptoms by name, category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    ></path>
                  </svg>
                </div>
              </div>
              <select className="h-10 px-3 rounded-xl border border-slate-200 text-[11px] font-black uppercase tracking-wider bg-white outline-none cursor-pointer hover:border-slate-300 transition-colors">
                <option>All Categories</option>
              </select>
              <select className="h-10 px-3 rounded-xl border border-slate-200 text-[11px] font-black uppercase tracking-wider bg-white outline-none cursor-pointer hover:border-slate-300 transition-colors">
                <option>All Status</option>
              </select>
              <button className="btn btn-secondary h-10 px-4 font-black uppercase tracking-widest text-[10px]">
                📥 Export
              </button>
            </div>

            <div className="card p-0 overflow-hidden min-h-[400px] border-slate-200 shadow-xl shadow-slate-100">
              <DataTable
                columns={columns}
                data={data?.symptoms || []}
                rowActions={rowActions}
                selectable
                isLoading={isLoading || isFetching}
                pagination={true}
                urlPersistence={{
                  pageKey: "sym_page",
                  pageSizeKey: "sym_pageSize",
                }}
                totalItems={data?.meta?.total || 0}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button className="btn btn-secondary text-[10px] font-black uppercase tracking-widest">
                ⭐ Verify Selected
              </button>
              <button className="btn btn-danger text-[10px] font-black uppercase tracking-widest">
                🗑️ Delete Selected
              </button>
            </div>
          </TabsContent>

          {["categories", "analytics"].map((tabId) => (
            <TabsContent
              key={tabId}
              value={tabId}
              className="outline-none animate-in fade-in zoom-in-95 duration-300"
            >
              <div className="card py-32 text-center border-dashed border-2 border-slate-200 bg-slate-50/50">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="w-20 h-20 bg-white rounded-3xl border border-slate-100 flex items-center justify-center mx-auto text-3xl shadow-xl shadow-slate-200/50 animate-bounce">
                    {tabId === "categories" ? "📂" : "📊"}
                  </div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                    {tabId} Module
                  </h3>
                  <p className="text-[13px] text-slate-500 font-bold leading-relaxed px-6">
                    We're building a high-fidelity dashboard for this module.
                    Real-time data visualization and insights are coming soon.
                  </p>
                  <div className="pt-4">
                    <span className="badge bg-slate-900 text-white px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-slate-200">
                      Coming Soon
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>
          ))}
        </div>
      </Tabs>

      <AddSymptomDialog />
      <ViewSymptomDialog />
    </div>
  );
};

export default SymptomsPage;
