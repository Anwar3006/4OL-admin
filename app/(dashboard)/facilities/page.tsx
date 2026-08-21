"use client";

import React, { useMemo, useState } from "react";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/Data-Table/data-table";
import { facilityColumns } from "@/components/Data-Table/columns/facilityColumns";
import KpiCard from "@/components/redesign/KpiCard";

import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";
import {
  useAddFacilityDialog,
  useViewFacilityDialog,
} from "@/stores/dialog-store";
import { cn } from "@/lib/utils";
import AddFacilityDialog from "./_components/add-facility-dialog";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Phone, MapPin } from "lucide-react";
import FacilityViewDialog from "./_components/view-facility-dialog";
import ReviewFacilityDialog from "./_components/review-facility-dialog";
import TopRatedTab from "./_components/top-rated-tab";
import FeaturedTab from "./_components/featured-tab";
import {
  useFacilityProfiles,
  useDeleteFacility,
} from "@/hooks/supabase-calls/useFacilities";
import {
  downloadFacilitiesCsv,
  useFacilityStatsApi,
  useUpdateFacilityStatusApi,
} from "@/hooks/supabase-calls/useFacilitiesApi";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { FACILITY_TYPE_ENUM } from "@/types/formInput";
import { toast } from "sonner";

const FacilitiesPage = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const activeTab = searchParams.get("tab") || "registry";
  const currentStatus = searchParams.get("status") || "all";
  const selectedType = searchParams.get("type") || "all";
  const search = searchParams.get("search") || "";

  // Read page from URL to trigger refetch when pagination changes
  const page = parseInt(searchParams.get("fac_page") || "1", 10);

  const [reviewFacilityId, setReviewFacilityId] = useState<string | null>(null);

  const { data, isLoading, isFetching, isError, error } = useFacilityProfiles({
    page,
    limit: 10,
    status: currentStatus === "all" ? undefined : (currentStatus as any),
    type: selectedType === "all" ? undefined : selectedType,
    search,
    includeStatsOnly: false,
  });
  const { data: stats } = useFacilityStatsApi();

  const viewFacility = useViewFacilityDialog();
  const addFacility = useAddFacilityDialog();
  const { mutate: deleteFacility } = useDeleteFacility();
  const updateStatus = useUpdateFacilityStatusApi();
  const { data: session } = useSupabaseSession();

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleTabChange = (tab: string) =>
    updateParams({ tab: tab === "registry" ? undefined : tab });
  const handleStatusChange = (status: string) =>
    updateParams({ status, fac_page: "1" });
  const handleTypeChange = (type: string) =>
    updateParams({ type, fac_page: "1" });
  const handleSearchChange = (val: string) =>
    updateParams({ search: val, fac_page: "1" });

  const facilityTypes = useMemo(() => {
    const counts = data?.typeCounts || {};
    return FACILITY_TYPE_ENUM.map((value) => ({
      value,
      count: (counts as Record<string, number>)[value] ?? 0,
    }));
  }, [data?.typeCounts]);

  const handleExport = async () => {
    try {
      await downloadFacilitiesCsv();
      toast.success("Facilities CSV exported");
    } catch (error: any) {
      toast.error(error?.message ?? "Export failed");
    }
  };

  const cardConfig: MobileCardConfig<any> = {
    header: {
      title: (data) => data.facility_name,
      subtitle: (data) => data.facility_type?.replace(/_/g, " "),
      badge: (data) => (
        <span
          className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
            data.status === "active"
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-amber-50 text-amber-700 border-amber-100"
          }`}
        >
          {data.status}
        </span>
      ),
    },
    fields: [
      {
        id: "phone",
        icon: <Phone className="w-3 h-3" />,
        render: (data) => data.contact_number,
      },
      {
        id: "region",
        icon: <MapPin className="w-3 h-3" />,
        render: (data) => data.region,
      },
    ],
    actions: [
      { label: "View Details", onClick: (data) => viewFacility.open(data.id) },
      { label: "Edit Facility", onClick: (data) => addFacility.open(data) },
    ],
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="🏥 Facilities Management"
        subtitle="Healthcare facilities registry · HEFRA validated · Live database records"
      >
        <button className="btn btn-secondary btn-sm" onClick={handleExport}>
          📥 Export CSV
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => {
            handleTabChange("registry");
            updateParams({ status: "pending", fac_page: "1" });
          }}
        >
          ⏳ Review Pending{stats ? ` (${stats.pending})` : ""}
        </button>
        <button
          className="btn btn-primary text-white font-black uppercase tracking-widest text-[9px]"
          onClick={() => addFacility.open()}
        >
          + Register Facility
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          icon="📊"
          label="Total"
          value={stats?.total?.toLocaleString() ?? "0"}
          variant="blue"
        />
        <KpiCard
          icon="✅"
          label="Active"
          value={stats?.active?.toLocaleString() ?? "0"}
          variant="green"
        />
        <KpiCard
          icon="⏳"
          label="Pending"
          value={stats?.pending?.toLocaleString() ?? "0"}
          variant="gold"
        />
        <KpiCard
          icon="🏆"
          label="Top Rated"
          value={stats?.topRated?.toLocaleString() ?? "0"}
          variant="purple"
        />
        <KpiCard
          icon="⭐"
          label="Avg Rating"
          value={stats?.averageRating != null ? `${stats.averageRating}` : "No ratings"}
          variant="teal"
        />
        <KpiCard
          icon="🚩"
          label="Rejected/Susp."
          value={((stats?.rejected ?? 0) + (stats?.suspended ?? 0)).toLocaleString()}
          variant="red"
        />
      </div>

      <Tabs value={activeTab} className="w-full" onValueChange={handleTabChange}>
        <div className="border-b border-slate-200 w-full overflow-hidden">
          <TabsList className="bg-transparent h-auto p-0 flex flex-nowrap gap-0 justify-start w-full overflow-x-auto overflow-y-hidden">
            {[
              { id: "registry", label: "📋 Registry" },
              { id: "top-rated", label: "⭐ Top Rated" },
              { id: "featured", label: "🌟 Featured" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "shrink-0 whitespace-nowrap px-5 py-3 text-[10px] font-black uppercase tracking-widest",
                  "text-slate-400 border-b-2 border-transparent transition-all rounded-none outline-none cursor-pointer",
                  "hover:text-emerald-700 hover:bg-emerald-50/40",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-emerald-700 data-[state=active]:border-emerald-700",
                )}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="registry" className="mt-5 space-y-4">
          <Tabs
            value={currentStatus}
            className="w-full"
            onValueChange={handleStatusChange}
          >
            <div className="flex flex-wrap gap-2 items-center">
              <input
                className="flex-1 min-w-[240px] h-9 px-4 rounded-xl border border-slate-200 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                placeholder="🔍 Search facilities, HEFRA no..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                className={cn(
                  "h-9 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  selectedType === "all"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50",
                )}
                onClick={() => handleTypeChange("all")}
              >
                All Types
              </button>
              {facilityTypes.map(({ value, count }) => (
                <button
                  key={value}
                  className={cn(
                    "h-9 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    selectedType === value
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50",
                  )}
                  onClick={() => handleTypeChange(value)}
                >
                  {value.replace(/_/g, " ")} ({count})
                </button>
              ))}
            </div>

            <div className="border-b border-slate-100 mb-4 w-full overflow-x-auto">
              <TabsList className="bg-transparent h-auto p-0 flex flex-nowrap gap-0 justify-start w-max">
                {[
                  { id: "all", label: "All Facilities" },
                  { id: "pending", label: "⏳ Pending Approval" },
                  { id: "active", label: "Active" },
                  { id: "inactive", label: "Inactive" },
                  { id: "suspended", label: "Suspended" },
                  { id: "rejected", label: "Rejected" },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      "shrink-0 whitespace-nowrap px-4 py-2.5 text-[9px] font-black uppercase tracking-widest",
                      "text-slate-400 border-b-2 border-transparent transition-all rounded-none outline-none cursor-pointer",
                      "hover:text-emerald-700 hover:bg-emerald-50/40",
                      "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-emerald-700 data-[state=active]:border-emerald-700",
                    )}
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <DataTable
              columns={facilityColumns}
              data={data?.facilities || []}
              isLoading={isLoading || isFetching}
              isError={isError}
              error={error}
              onRowClick={(row) =>
                row.status === "pending"
                  ? setReviewFacilityId(row.id)
                  : viewFacility.open(row.id)
              }
              bulkActions={[
                {
                  label: "✅ Approve Selected",
                  onClick: (rows: any[]) =>
                    updateStatus.mutate({
                      id: rows[0].id,
                      ids: rows.map((r) => r.id),
                      status: "active",
                    }),
                },
                {
                  label: "⏸ Suspend Selected",
                  onClick: (rows: any[]) =>
                    updateStatus.mutate({
                      id: rows[0].id,
                      ids: rows.map((r) => r.id),
                      status: "suspended",
                      reason: "Suspended via admin bulk action",
                    }),
                },
              ]}
              onDeleteSelected={(rows) => {
                if (
                  globalThis.confirm(
                    `Are you sure you want to delete ${rows.length} facilit${rows.length > 1 ? "ies" : "y"}? This action cannot be undone.`,
                  )
                ) {
                  rows.forEach((row: any) =>
                    deleteFacility({
                      adminId: session?.user?.id || "",
                      id: row.id,
                    }),
                  );
                }
              }}
              cardConfig={cardConfig}
              pagination={true}
              urlPersistence={{
                pageKey: "fac_page",
                pageSizeKey: "fac_pageSize",
              }}
              totalItems={data?.totalRegistered || 0}
            />
          </div>
        </TabsContent>

        <TabsContent value="top-rated" className="mt-5">
          <TopRatedTab />
        </TabsContent>

        <TabsContent value="featured" className="mt-5">
          <FeaturedTab />
        </TabsContent>
      </Tabs>

      <AddFacilityDialog />
      <FacilityViewDialog />
      <ReviewFacilityDialog
        facilityId={reviewFacilityId}
        onClose={() => setReviewFacilityId(null)}
      />
    </div>
  );
};

export default FacilitiesPage;
