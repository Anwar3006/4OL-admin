"use client";

import React, { useState, useCallback, useMemo } from "react";
import PageHeader from "@/components/redesign/PageHeader";
import { DataTable } from "@/components/Data-Table/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAddHealthyLivingDialog,
  useViewHealthyLivingDialog,
} from "@/stores/dialog-store";
import {
  useHealthyLivings,
  useDeleteHealthyLiving,
} from "@/hooks/supabase-calls/useHealthyLiving";
import AddHealthyLivingDialog from "./_components/add-healthyLiving-dialog";
import ViewHealthyLivingDialog from "./_components/view-healthyLiving-dialog";
import { cn } from "@/lib/utils";
import HealthyLivingStats from "./_components/HealthyLivingStats";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearchParams } from "next/navigation";

const HealthyLivingPage = () => {
  const addHealthLiving = useAddHealthyLivingDialog();
  const viewHealthyLiving = useViewHealthyLivingDialog();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const searchParams = useSearchParams();

  // Read page from URL to trigger refetch when pagination changes
  const page = parseInt(searchParams.get("hl_page") || "1", 10);

  const { mutate: deleteHealthyLiving } = useDeleteHealthyLiving();
  const { data: healthyLivingData } = useHealthyLivings({
    page,
    limit: 10,
    search: search || undefined,
    // Pass the status filter here (convert "all" to undefined so the hook ignores it)
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const handleDelete = useCallback(
    (id: string) => {
      if (
        globalThis.confirm(
          "Are you sure you want to delete this Healthy Living item?",
        )
      ) {
        deleteHealthyLiving(id);
      }
    },
    [deleteHealthyLiving],
  );

  const rowActions = [
    {
      label: "View",
      icon: "👁️",
      onClick: (row: any) => viewHealthyLiving.open(row.id),
    },
    {
      label: "Edit",
      icon: "✏️",
      onClick: (row: any) => addHealthLiving.open(row),
    },
    {
      label: "Delete",
      icon: "🗑️",
      onClick: (row: any) => handleDelete(row.id),
      danger: true,
    },
  ];

  // Convert data to columns format for Data-Table
  const tableColumns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Article Name",
        cell: ({ row }: any) => (
          <div className="flex flex-col gap-1">
            <span className="font-bold text-sm text-slate-800">
              {row.original.name || "Untitled"}
            </span>
            {row.original.slug && (
              <span className="text-xs text-slate-500 font-mono">
                /{row.original.slug}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "content_type",
        header: "Type",
        cell: ({ row }: any) => (
          <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-700 rounded capitalize">
            {row.original.content_type || "article"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }: any) => {
          const statusColors: Record<string, string> = {
            published: "bg-emerald-50 text-emerald-700",
            draft: "bg-slate-100 text-slate-700",
            pending_review: "bg-amber-50 text-amber-700",
            archived: "bg-rose-50 text-rose-700",
          };
          const colorClass =
            statusColors[row.original.status] || statusColors.draft;
          return (
            <span
              className={`text-xs font-semibold px-2 py-1 rounded capitalize ${colorClass}`}
            >
              {row.original.status?.replace("_", " ") || "draft"}
            </span>
          );
        },
      },
      {
        accessorKey: "is_featured",
        header: "Featured",
        cell: ({ row }: any) => (
          <div className="text-center">
            {row.original.is_featured ? (
              <span className="text-lg">⭐</span>
            ) : (
              <span className="text-slate-300">○</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "view_count",
        header: "Views",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-1 justify-center">
            <Eye className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-sm text-slate-600">
              {row.original.view_count || 0}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Created",
        cell: ({ row }: any) => (
          <span className="text-xs text-slate-600">
            {new Date(row.original.created_at).toLocaleDateString(undefined, {
              dateStyle: "medium",
            })}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="🥗 Healthy Living"
        subtitle="Public health knowledge base · Lifestyle guidance · Wellness content"
      >
        {/* <button className="btn btn-secondary btn-sm font-bold">
          📥 Export CSV
        </button> */}
        <button
          className="btn btn-primary btn-sm text-white font-black uppercase tracking-widest text-[9px]"
          onClick={() => addHealthLiving.open()}
        >
          + Add Article
        </button>
      </PageHeader>

      {/* KPI Grid */}
      <HealthyLivingStats />

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
              { id: "all", label: "All Content", icon: "🥗" },
              // { id: "categories", label: "Categories", icon: "📂" },
              { id: "engagement", label: "Analytics", icon: "📊" },
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

        <TabsContent value="all" className="outline-none mt-4">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-center mb-4">
            <div className="relative w-full sm:flex-1 sm:min-w-[240px]">
              <input
                className="w-full h-9 pl-3 pr-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none transition-all"
                placeholder="🔍 Search articles by title, topic..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex w-full sm:w-auto gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px] h-9 text-[11px] font-bold bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-ek-green/20">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="card p-0 overflow-hidden border border-slate-200 shadow-sm rounded-xl">
            <DataTable
              columns={tableColumns}
              data={healthyLivingData?.healthyLivings || []}
              selectable={false}
              pagination={true}
              urlPersistence={{
                pageKey: "hl_page",
                pageSizeKey: "hl_pageSize",
              }}
              totalItems={healthyLivingData?.meta?.total || 0}
            />
          </div>

          {/* <div className="flex gap-2 mt-4">
    <button className="btn btn-secondary btn-sm font-bold text-[10px]">
      ✅ Publish Selected
    </button>
    <button className="btn btn-danger btn-sm font-bold text-[10px]">
      🗑️ Delete Selected
    </button>
  </div> */}
        </TabsContent>

        {["categories", "engagement"].map((tabId) => (
          <TabsContent key={tabId} value={tabId} className="outline-none mt-4">
            <div className="card py-20 text-center border border-slate-200 shadow-sm rounded-xl">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto text-2xl">
                  {tabId === "categories" ? "📂" : "📊"}
                </div>
                <h3 className="text-lg font-black text-slate-800 capitalize">
                  {tabId} View
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  This module is currently being optimized for wellness data
                  analytics.
                </p>
                <div className="flex justify-center gap-2">
                  <span className="badge badge-amber uppercase">
                    Coming Soon
                  </span>
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
