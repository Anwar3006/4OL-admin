"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { DataTable } from "@/components/Data-Table/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounce } from "@/hooks/use-debounce";
import { useAddConditionDialog, useViewConditionDialog } from "@/features/diseases/data/dialog-hooks";
import AddSymptomDialog from "./add-symptom-dialog";
import ViewSymptomDialog from "./view-symptom-dialog";
import SymptomAnalyticsTab from "./analytics-tab";
import SymptomCategoriesTab from "./categories-tab";
import SymptomCarouselTab from "./carousel-tab";
import {
  useSymptoms,
  useSymptomStats,
} from "@/features/symptoms/data/useSymptoms";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";

const SymptomsPage = () => {
  const addSymptom = useAddConditionDialog();
  const { open: openViewDialog } = useViewConditionDialog();

  const limit = 10;
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const idParam = searchParams.get("id");
  const [activeTab, setActiveTab] = useState(tabParam || "all");

  // Deep-link support (Phase 4): /symptoms?tab=categories&category=x and
  // /symptoms?tab=analytics arrive from the Anatomy menu + Analytics bars.
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) setActiveTab(tabParam);
  }, [tabParam]);                                                    // eslint-disable-line

  // Deep-link support: /symptoms?id=<uuid> opens the view dialog — used by
  // the Anatomy Linked Symptoms tab and the analytics leaderboards.
  const lastOpenedId = React.useRef<string | null>(null);
  useEffect(() => {
    if (idParam && lastOpenedId.current !== idParam) {
      lastOpenedId.current = idParam;
      openViewDialog(idParam);
    }
  }, [idParam]);                                                     // eslint-disable-line

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", value);
    window.history.pushState(null, "", `?${params.toString()}`);
  };

  // Read page from URL to trigger refetch when pagination changes
  const page = parseInt(searchParams.get("sym_page") || "1", 10);

  const { data, isLoading, isFetching, isError, error } = useSymptoms({
    limit,
    page,
    search: debouncedSearch,
  });

  const { data: stats, isLoading: isStatsLoading } = useSymptomStats();

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    item: any;
  }>({ isOpen: false, item: null });

  const handleDeleteClick = useCallback((symptom: any) => {
    setDeleteModal({ isOpen: true, item: symptom });
  }, []);

  const handleDeleteConfirm = () => {
    if (deleteModal.item) {
      console.log("Delete symptom:", deleteModal.item.id);
      // TODO: Implement actual delete mutation
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
      header: "Symptom Name",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
              {row.original.name.length > 20
                ? `${row.original.name.slice(0, 20)}...`
                : row.original.name}
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
                className="text-2xs text-slate-500 bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded font-bold border border-slate-100 dark:border-slate-800"
              >
                {bp}
              </span>
            ))
          ) : (
            <span className="text-2xs text-slate-300 italic">—</span>
          )}
          {row.original.bodyParts?.length > 3 && (
            <span className="text-3xs text-slate-400 font-bold">
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
        <div className="text-2xs text-slate-500 font-medium">
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
        <span className="badge badge-green">
          {row.original.status === "published" ? "✅ Published" : "⏳ Pending"}
        </span>
      ),
    },
    {
      accessorKey: "views",
      header: "Views",
      cell: ({ row }: any) => (
        <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
          {row.original.views?.toLocaleString() || "0"}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }: any) => {
        const symptom = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <button
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                openViewDialog(symptom.id);
              }}
            >
              👁️
            </button>
            <button
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/15 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                addSymptom.open(symptom);
              }}
            >
              ✏️
            </button>
            <button
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(symptom);
              }}
            >
              🗑️
            </button>
          </div>
        );
      },
    },
    ],
    [addSymptom, handleDeleteClick, openViewDialog],
  );

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

      {/*
        KPI Grid — useSymptomStats (features/symptoms/data/useSymptoms.ts)
        runs plain `count(*)` reads against the live `symptoms` table on
        every call; nothing here is a stored dated series, so none of
        these qualifies for a trend or `lg` sizing (Rule 1). Systemic
        Count is a subset of Total Symptoms (same table, filtered by
        `is_systemic`), so — like the Active/Total precedent on the
        Subscriptions page — it merges into one "Systemic / Total" card
        instead of two cards stating overlapping information; Categories
        counts a different entity (categories, not symptoms) so it stays
        separate, same as Diseases' Total Conditions/Categories.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <KpiCard
          icon="🩺"
          label="Systemic / Total Symptoms"
          value={
            isStatsLoading
              ? "..."
              : `${(stats?.systemicCount ?? 0).toLocaleString()} / ${(stats?.totalSymptoms ?? 0).toLocaleString()}`
          }
          variant="teal"
          delta="Systemic symptoms in the database"
          deltaType="neutral"
        />
        <KpiCard
          size="sm"
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
          size="sm"
          icon="✅"
          label="Verification Rate"
          value={isStatsLoading ? "..." : `${stats?.verificationRate ?? 0}%`}
          variant="green"
          delta="Reviewed by an editor"
          deltaType="neutral"
        />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="border-b border-slate-200 dark:border-slate-700 mb-5 w-full overflow-hidden">
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
              { id: "carousel", label: "Carousel", icon: "🎠" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "shrink-0 whitespace-nowrap px-4 sm:px-5 py-2.5 sm:py-3",
                  "text-2xs sm:text-xs font-black uppercase tracking-widest",
                  "text-slate-400 border-b-2 border-transparent",
                  "transition-all rounded-none outline-none cursor-pointer",
                  "hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/15/40",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  "data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-700 dark:data-[state=active]:border-emerald-400",
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
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-4 focus:ring-ek-green/10 focus:border-ek-green outline-none transition-all"
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
              <select className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-wider bg-white dark:bg-slate-800 outline-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                <option>All Categories</option>
              </select>
              <select className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-wider bg-white dark:bg-slate-800 outline-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                <option>All Status</option>
              </select>
              <button className="btn btn-secondary h-10 px-4 font-black uppercase tracking-widest text-2xs">
                📥 Export
              </button>
            </div>

            <div className="card p-0 overflow-hidden min-h-[400px] border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-100">
              <DataTable
                columns={columns}
                data={data?.symptoms || []}
                selectable
                isLoading={isLoading || isFetching}
                isError={isError}
                error={error}
                pagination={true}
                urlPersistence={{
                  pageKey: "sym_page",
                  pageSizeKey: "sym_pageSize",
                }}
                totalItems={data?.meta?.total || 0}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button className="btn btn-secondary text-2xs font-black uppercase tracking-widest">
                ⭐ Verify Selected
              </button>
              <button className="btn btn-danger text-2xs font-black uppercase tracking-widest">
                🗑️ Delete Selected
              </button>
            </div>
          </TabsContent>

          <TabsContent
            value="categories"
            className="outline-none animate-in fade-in zoom-in-95 duration-300 w-full min-w-0"
          >
            <SymptomCategoriesTab />
          </TabsContent>

          <TabsContent
            value="analytics"
            className="outline-none animate-in fade-in zoom-in-95 duration-300 w-full min-w-0"
          >
            <SymptomAnalyticsTab />
          </TabsContent>

          <TabsContent
            value="carousel"
            className="outline-none animate-in fade-in zoom-in-95 duration-300 w-full min-w-0"
          >
            <SymptomCarouselTab />
          </TabsContent>
        </div>
      </Tabs>

      <AddSymptomDialog />
      <ViewSymptomDialog />
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Symptom"
        itemName={deleteModal.item?.name || ""}
        itemType="symptom"
      />
    </div>
  );
};

export default SymptomsPage;
