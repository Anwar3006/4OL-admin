"use client";

/**
 * Diseases & Conditions (Gap Analysis Part I, I-Phase 4).
 * All tab is route-backed (/api/diseases) with status/featured filters,
 * ICD-11 + Likes/Saves columns, bulk Feature/Publish/Delete and CSV export.
 * Carousel / Engagement / Linkages tabs render real data via dedicated
 * server routes — no "Coming Soon" placeholders remain.
 */

import React, { useCallback, useMemo, useState } from "react";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { DataTable } from "@/components/Data-Table/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useConditionStats } from "@/hooks/supabase-calls/useCondition";
import {
  downloadConditionsCsv,
  useDeleteConditionApi,
  useDiseasesList,
  useFeatureCondition,
  useUpdateConditionStatus,
} from "@/hooks/supabase-calls/useDiseasesApi";

import AddConditionDialog from "./_components/add-condition-dialog";
import CarouselTab from "./_components/carousel-tab";
import EngagementTab from "./_components/engagement-tab";
import LinkagesTab from "./_components/linkages-tab";
import {
  useAddConditionDialog,
  useViewConditionDialog,
} from "@/stores/dialog-store";
import { ViewConditionDialog } from "./_components/view-condition-dialog";
import { useSearchParams } from "next/navigation";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";

const SEVERITY_BADGE: Record<string, string> = {
  low: "badge-green",
  moderate: "badge-amber",
  high: "badge-orange",
  critical: "badge-red",
};

const DiseasesPage = () => {
  const addCondition = useAddConditionDialog();
  const { open: openViewDialog } = useViewConditionDialog();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [featuredFilter, setFeaturedFilter] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const searchParams = useSearchParams();

  // Read page from URL to trigger refetch when pagination changes
  const page = parseInt(searchParams.get("dis_page") || "1", 10);

  const { data, isLoading, isFetching, isError, error } = useDiseasesList({
    params: {
      page,
      limit: 10,
      search,
      status: statusFilter,
      featured: featuredFilter,
    },
    enabled: true,
  });

  const { data: stats, isLoading: isStatsLoading } = useConditionStats(true);

  const { mutate: deleteConditionApi } = useDeleteConditionApi();
  const { mutate: setStatus } = useUpdateConditionStatus();
  const { mutate: setFeatured } = useFeatureCondition();

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    items: any[];
  }>({ isOpen: false, items: [] });

  const handleDeleteClick = useCallback((condition: any) => {
    setDeleteModal({ isOpen: true, items: [condition] });
  }, []);

  const handleDeleteConfirm = () => {
    deleteModal.items.forEach((item) => {
      const images = Array.isArray(item.image_url)
        ? item.image_url
        : item.image_url
          ? [item.image_url]
          : [];
      deleteConditionApi({ id: item.id, imagePaths: images });
    });
    setDeleteModal({ isOpen: false, items: [] });
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, items: [] });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadConditionsCsv();
      toast.success("Conditions exported.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsExporting(false);
    }
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
    {
      accessorKey: "icd11_code",
      header: "ICD-11",
      cell: ({ row }: any) =>
        row.original.icd11_code ? (
          <span className="font-mono text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
            {row.original.icd11_code}
          </span>
        ) : (
          <span className="text-[10px] text-slate-300 italic">—</span>
        ),
    },
    {
      accessorKey: "severity",
      header: "Severity",
      cell: ({ row }: any) =>
        row.original.severity ? (
          <span
            className={cn(
              "badge",
              SEVERITY_BADGE[row.original.severity] ?? "badge-amber",
            )}
          >
            {row.original.severity}
          </span>
        ) : (
          <span className="text-[10px] text-slate-300 italic">—</span>
        ),
    },
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
      accessorKey: "like_count",
      header: "❤️ Likes",
      cell: ({ row }: any) => (
        <span className="font-black text-slate-700 text-[11px]">
          {row.original.like_count?.toLocaleString() || "0"}
        </span>
      ),
    },
    {
      accessorKey: "save_count",
      header: "🔖 Saves",
      cell: ({ row }: any) => (
        <span className="font-black text-slate-700 text-[11px]">
          {row.original.save_count?.toLocaleString() || "0"}
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
              ⭐ #{row.original.featured_order ?? "–"}
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
        <button
          className="btn btn-secondary"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? "Exporting…" : "📥 Export CSV"}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setActiveTab("carousel")}
        >
          🎠 Manage Carousel
        </button>
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
          delta="Health content database"
          deltaType="neutral"
        />
        <KpiCard
          icon="📂"
          label="Categories"
          value={stats?.totalCategories?.toLocaleString() || "0"}
          variant="purple"
          delta="Active database"
        />
        <KpiCard
          icon="👁️"
          label="Total Views"
          value={isStatsLoading ? "..." : (stats?.totalViews ?? 0).toLocaleString()}
          variant="red"
          delta="Lifetime views"
          deltaType="neutral"
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
          label="Review Rate"
          value={isStatsLoading ? "..." : `${stats?.reviewRate ?? 0}%`}
          variant="green"
          delta="Reviewed by an editor"
          deltaType="neutral"
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
              <select
                className="h-10 px-3 rounded-xl border border-slate-200 text-[11px] font-black uppercase tracking-wider bg-white outline-none cursor-pointer hover:border-slate-300 transition-colors"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending_review">Pending Review</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              <select
                className="h-10 px-3 rounded-xl border border-slate-200 text-[11px] font-black uppercase tracking-wider bg-white outline-none cursor-pointer hover:border-slate-300 transition-colors"
                value={featuredFilter}
                onChange={(e) => setFeaturedFilter(e.target.value)}
              >
                <option value="">Featured: All</option>
                <option value="yes">Featured Only</option>
                <option value="no">Not Featured</option>
              </select>
              <button
                className="btn btn-secondary h-10 px-4 font-black uppercase tracking-widest text-[10px]"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? "Exporting…" : "📥 Export"}
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
                bulkActions={[
                  {
                    label: "⭐ Feature Selected",
                    onClick: (rows: any[]) =>
                      setFeatured({
                        id: rows[0].id,
                        ids: rows.map((r) => r.id),
                        featured: true,
                      }),
                  },
                  {
                    label: "✅ Publish",
                    onClick: (rows: any[]) =>
                      setStatus({
                        id: rows[0].id,
                        ids: rows.map((r) => r.id),
                        status: "published",
                      }),
                  },
                ]}
                onDeleteSelected={(rows: any[]) =>
                  setDeleteModal({ isOpen: true, items: rows })
                }
                deleteLabel="🗑️ Delete"
                pagination={true}
                urlPersistence={{
                  pageKey: "dis_page",
                  pageSizeKey: "dis_pageSize",
                }}
                totalItems={data?.meta?.total || 0}
              />
            </div>
          </TabsContent>

          <TabsContent
            value="carousel"
            className="outline-none animate-in fade-in zoom-in-95 duration-300 w-full min-w-0"
          >
            <CarouselTab />
          </TabsContent>

          <TabsContent
            value="engagement"
            className="outline-none animate-in fade-in zoom-in-95 duration-300 w-full min-w-0"
          >
            <EngagementTab />
          </TabsContent>

          <TabsContent
            value="linkages"
            className="outline-none animate-in fade-in zoom-in-95 duration-300 w-full min-w-0"
          >
            <LinkagesTab />
          </TabsContent>
        </div>
      </Tabs>

      <AddConditionDialog />
      <ViewConditionDialog />
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Condition"
        itemName={
          deleteModal.items.length > 1
            ? `${deleteModal.items.length} selected conditions`
            : deleteModal.items[0]?.name || ""
        }
        itemType="condition"
      />
    </div>
  );
};

export default DiseasesPage;
