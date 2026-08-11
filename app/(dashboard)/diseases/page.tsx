"use client";

import React, { useCallback, useMemo, useState } from "react";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { DataTable } from "@/components/Data-Table/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  useConditions,
  useDeleteCondition,
  useConditionStats,
} from "@/hooks/supabase-calls/useCondition";

import AddConditionDialog from "./_components/add-condition-dialog";
import {
  useAddConditionDialog,
  useViewConditionDialog,
} from "@/stores/dialog-store";
import { ViewConditionDialog } from "./_components/view-condition-dialog";
import { useSearchParams } from "next/navigation";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";

const DiseasesPage = () => {
  const addCondition = useAddConditionDialog();
  const { open: openViewDialog } = useViewConditionDialog();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const searchParams = useSearchParams();

  // Read page from URL to trigger refetch when pagination changes
  const page = parseInt(searchParams.get("dis_page") || "1", 10);

  const { data, isLoading, isFetching, isError, error } = useConditions({
    params: { page, limit: 10, search },
    enabled: true,
  });

  const { data: stats, isLoading: isStatsLoading } = useConditionStats(true);

  const { mutate: deleteCondition } = useDeleteCondition();

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    item: any;
  }>({ isOpen: false, item: null });

  const handleDeleteClick = useCallback((condition: any) => {
    setDeleteModal({ isOpen: true, item: condition });
  }, []);

  const handleDeleteConfirm = () => {
    if (deleteModal.item) {
      const images = Array.isArray(deleteModal.item.image_url)
        ? deleteModal.item.image_url
        : deleteModal.item.image_url
          ? [deleteModal.item.image_url]
          : [];
      deleteCondition({ id: deleteModal.item.id, imagePath: images });
      setDeleteModal({ isOpen: false, item: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, item: null });
  };

  const columns = useMemo(
    () => [
    {
      accessorKey: "name",
      header: "Condition",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-3">
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
    // {
    //   accessorKey: "icd_11",
    //   header: "ICD-11",
    //   cell: ({ row }: any) => (
    //     <span className="font-mono text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
    //       {row.original.icd_11 || "BA80"}
    //     </span>
    //   ),
    // },
    {
      accessorKey: "categories",
      header: "Category",
      cell: ({ row }: any) => (
        <div className="flex flex-wrap gap-1">
          {(row.original.categories || ["General"]).map(
            (cat: string, i: number) => (
              <span key={i} className="badge badge-blue">
                {cat}
              </span>
            ),
          )}
        </div>
      ),
    },
    {
      accessorKey: "bodyParts",
      header: "Body Parts",
      cell: ({ row }: any) => (
        <div className="flex flex-wrap gap-1">
          {(row.original.bodyParts || []).length > 0 ? (
            row.original.bodyParts.map((bp: string, i: number) => (
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
        </div>
      ),
    },
    {
      accessorKey: "view_count",
      header: "👁️ Views",
      cell: ({ row }: any) => (
        <span className="font-black text-slate-700 text-[11px]">
          {row.original.view_count?.toLocaleString() || "0"}
        </span>
      ),
    },
    {
      accessorKey: "is_featured",
      header: "Carousel",
      cell: ({ row }: any) => (
        <div className="text-center">
          {row.original.is_featured ? (
            <span className="badge badge-green shadow-sm shadow-green-100 border border-green-200">
              ⭐ Featured
            </span>
          ) : (
            <span className="text-[10px] text-slate-300 font-bold tracking-widest uppercase">
              Off
            </span>
          )}
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
            row.original.status === "published" ? "badge-green" : "badge-amber",
          )}
        >
          {row.original.status === "published"
            ? "✅ Published"
            : "⏳ " + (row.original.status || "Draft")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }: any) => (
        <div className="flex items-center justify-end gap-2">
          <button
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              openViewDialog(row.original.id);
            }}
          >
            👁️
          </button>
          <button
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              addCondition.open(row.original);
            }}
          >
            ✏️
          </button>
          <button
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(row.original);
            }}
          >
            🗑️
          </button>
        </div>
      ),
    },
    ],
    [addCondition, handleDeleteClick, openViewDialog],
  );

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="🦠 Diseases & Conditions"
        subtitle="Health content database · ICD-11 indexed · Managed by Content Manager"
      >
        <button className="btn btn-secondary">📥 Export CSV</button>
        <button className="btn btn-secondary">🎠 Manage Carousel</button>
        <button className="btn btn-primary" onClick={() => addCondition.open()}>
          + Add Condition
        </button>
      </PageHeader>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 sm:gap-5">
        <KpiCard
          icon="📊"
          label="Total Conditions"
          value={data?.meta?.total?.toLocaleString() || "0"}
          variant="blue"
          delta="+12 month"
          deltaType="up"
        />
        <KpiCard
          icon="📂"
          label="Categories"
          value={stats?.totalCategories?.toLocaleString() || "0"}
          variant="purple"
          delta="Active database"
        />
        <KpiCard
          icon="🚩"
          label="Total Likes"
          // value={stats?.totalLikes?.toLocaleString() || "0"}
          value={0}
          variant="red"
          delta="High engagement"
          deltaType="up"
        />
        <KpiCard
          icon="⏳"
          label="Recurring Type"
          value={stats?.mostRecurringCategory || "N/A"}
          variant="amber"
          delta="Dominant category"
        />
        <KpiCard
          icon="🛡️"
          label="Body Focus"
          value={stats?.mostAffectedBodyPart || "N/A"}
          variant="teal"
          delta="Targeted area"
        />
        <KpiCard
          icon="✅"
          label="Avg Engagement"
          value={0}
          variant="green"
          delta="High interest"
          deltaType="up"
        />
      </div>

      <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
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
              { id: "all", label: "All Conditions", icon: "🦠" },
              { id: "carousel", label: "Carousel Features", icon: "🎠" },
              { id: "engagement", label: "Engagement Analytics", icon: "📊" },
              { id: "linkages", label: "Page Linkages", icon: "🔗" },
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
            className="outline-none space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full min-w-0"
          >
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[300px]">
                <input
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 text-xs focus:ring-4 focus:ring-ek-green/10 focus:border-ek-green outline-none transition-all"
                  placeholder="🔍 Search by name, ICD code, category..."
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
                data={data?.conditions || []}
                selectable
                isLoading={isLoading || isFetching}
                isError={isError}
                error={error}
                onRowClick={(row: any) => openViewDialog(row.id)}
                pagination={true}
                urlPersistence={{
                  pageKey: "dis_page",
                  pageSizeKey: "dis_pageSize",
                }}
                totalItems={data?.meta?.total || 0}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button className="btn btn-secondary text-[10px] font-black uppercase tracking-widest">
                ⭐ Feature Selected
              </button>
              <button className="btn btn-secondary text-[10px] font-black uppercase tracking-widest">
                ✅ Publish
              </button>
              <button className="btn btn-danger text-[10px] font-black uppercase tracking-widest">
                🗑️ Delete
              </button>
            </div>
          </TabsContent>

          {["carousel", "engagement", "linkages"].map((tabId) => (
            <TabsContent
              key={tabId}
              value={tabId}
              className="outline-none animate-in fade-in zoom-in-95 duration-300 w-full min-w-0"
            >
              <div className="card py-32 text-center border-dashed border-2 border-slate-200 bg-slate-50/50">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="w-20 h-20 bg-white rounded-3xl border border-slate-100 flex items-center justify-center mx-auto text-3xl shadow-xl shadow-slate-200/50 animate-bounce">
                    {tabId === "carousel"
                      ? "🎠"
                      : tabId === "engagement"
                        ? "📊"
                        : "🔗"}
                  </div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                    {tabId} Module
                  </h3>
                  <p className="text-[13px] text-slate-500 font-bold leading-relaxed px-6">
                    We're building a high-fidelity dashboard for this module.
                    Real-time data visualization and linkages are coming soon.
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

      <AddConditionDialog />
      <ViewConditionDialog />
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Condition"
        itemName={deleteModal.item?.name || ""}
        itemType="condition"
      />
    </div>
  );
};

export default DiseasesPage;
