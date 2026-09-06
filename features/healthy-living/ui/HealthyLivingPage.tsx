"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
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
} from "@/features/healthy-living/data/useHealthyLiving";
import AddHealthyLivingDialog from "./add-healthyLiving-dialog";
import ViewHealthyLivingDialog from "./view-healthyLiving-dialog";
import HealthyLivingAnalyticsTab from "./analytics-tab";
import HealthyLivingCarouselTab from "./carousel-tab";
import { cn } from "@/lib/utils";
import HealthyLivingStats from "./HealthyLivingStats";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearchParams } from "next/navigation";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";

const HealthyLivingPage = () => {
  const addHealthLiving = useAddHealthyLivingDialog();
  const viewHealthyLiving = useViewHealthyLivingDialog();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "all");

  // Deep-link support (Phase 4): /healthy_living?tab=engagement etc.
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) setActiveTab(tabParam);
  }, [tabParam]);                                                    // eslint-disable-line

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", value);
    window.history.pushState(null, "", `?${params.toString()}`);
  };

  // Read page from URL to trigger refetch when pagination changes
  const page = parseInt(searchParams.get("hl_page") || "1", 10);

  const { mutate: deleteHealthyLiving } = useDeleteHealthyLiving();

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    item: any;
  }>({ isOpen: false, item: null });

  const handleDeleteClick = useCallback((item: any) => {
    setDeleteModal({ isOpen: true, item });
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteModal.item) {
      deleteHealthyLiving(deleteModal.item.id);
      setDeleteModal({ isOpen: false, item: null });
    }
  }, [deleteModal.item, deleteHealthyLiving]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteModal({ isOpen: false, item: null });
  }, []);

  const { data: healthyLivingData, isLoading, isError, error } = useHealthyLivings({
    page,
    limit: 10,
    search: search || undefined,
    // Pass the status filter here (convert "all" to undefined so the hook ignores it)
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  // Convert data to columns format for Data-Table
  const tableColumns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Article Name",
        cell: ({ row }: any) => (
          <div className="flex flex-col gap-1">
            <span className="font-bold text-sm text-slate-800">
              {row.original.name.length > 20
                ? `${row.original.name.slice(0, 20)}...`
                : row.original.name}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }: any) => {
          const statusColors: Record<string, string> = {
            published: "bg-emerald-50 text-emerald-700",
            draft: "bg-slate-100 text-slate-700",
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
        accessorKey: "categories",
        header: "Categories",
        cell: ({ row }: any) => {
          const cats: string[] = row.original.categories || [];
          if (cats.length === 0) {
            return <span className="text-xs text-slate-300">—</span>;
          }
          return (
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              {cats.slice(0, 2).map((name) => (
                <span
                  key={name}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700"
                >
                  {name}
                </span>
              ))}
              {cats.length > 2 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                  +{cats.length - 2}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "view_count",
        header: "Views",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-1 justify-center">
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
      {
        id: "actions",
        header: "",
        cell: ({ row }: any) => {
          const item = row.original;
          return (
            <div className="flex items-center justify-end gap-2">
              <button
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  viewHealthyLiving.open(item.id);
                }}
              >
                👁️
              </button>
              <button
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  addHealthLiving.open(item);
                }}
              >
                ✏️
              </button>
              <button
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(item);
                }}
              >
                🗑️
              </button>
            </div>
          );
        },
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

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
              { id: "engagement", label: "Analytics", icon: "📊" },
              { id: "carousel", label: "Carousel", icon: "🎠" },
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

        <TabsContent value="all" className="outline-none mt-4 w-full min-w-0">
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
              isLoading={isLoading}
              isError={isError}
              error={error}
              onRowClick={(row: any) => viewHealthyLiving.open(row.id)}
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

        <TabsContent value="engagement" className="outline-none mt-4 w-full min-w-0">
          <HealthyLivingAnalyticsTab />
        </TabsContent>

        <TabsContent value="carousel" className="outline-none mt-4 w-full min-w-0">
          <HealthyLivingCarouselTab />
        </TabsContent>
      </Tabs>

      <AddHealthyLivingDialog />
      <ViewHealthyLivingDialog />
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Healthy Living Article"
        itemName={deleteModal.item?.name || ""}
        itemType="healthy living article"
      />
    </div>
  );
};

export default HealthyLivingPage;
