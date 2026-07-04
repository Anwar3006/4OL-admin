"use client";

import React, { useMemo } from "react";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/Data-Table/data-table";
import { facilityColumns } from "@/components/Data-Table/columns/facilityColumns";
import KpiCard from "@/components/redesign/KpiCard";
import { useFacilities } from "@/hooks/supabase-calls/useFacilities";
import { usePagination } from "@/hooks/use-pagination";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";
import { useAddFacilityDialog, useViewFacilityDialog } from "@/stores/dialog-store";
import { cn } from "@/lib/utils";
import AddFacilityDialog from "./_components/add-facility-dialog";
import FacilityViewDialog from "./_components/facility-view-dialog";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, Phone, MapPin } from "lucide-react";

const FacilitiesPage = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const currentStatus = searchParams.get("status") || "all";
  const selectedType = searchParams.get("type") || "all";
  const search = searchParams.get("search") || "";

  const { page, onPageChange, onNextPage, onPreviousPage, pageSize } = usePagination({ key: "fac_page" });

  const { data, isLoading, isFetching } = useFacilities({
    page,
    limit: pageSize,
    status: currentStatus === "all" ? undefined : (currentStatus as any),
    type: selectedType === "all" ? undefined : selectedType,
    search,
  });

  const viewFacility = useViewFacilityDialog();
  const addFacility = useAddFacilityDialog();

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleStatusChange = (status: string) => updateParams({ status, fac_page: "1" });
  const handleTypeChange = (type: string) => updateParams({ type, fac_page: "1" });
  const handleSearchChange = (val: string) => updateParams({ search: val, fac_page: "1" });

  const facilityTypes = useMemo(() => {
    const counts = data?.typeCounts || {};
    return Object.entries(counts)
      .map(([value, count]) => ({ value, count: count as number }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [data?.typeCounts]);

  const cardConfig: MobileCardConfig<any> = {
    header: {
      title: (data) => data.facility_name,
      subtitle: (data) => data.facility_type?.replace(/_/g, " "),
      badge: (data) => (
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
          data.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
        }`}>
          {data.status}
        </span>
      ),
    },
    fields: [
      { id: "phone", icon: <Phone className="w-3 h-3" />, render: (data) => data.contact_number },
      { id: "region", icon: <MapPin className="w-3 h-3" />, render: (data) => data.region },
    ],
    actions: [
      { label: "View Details", onClick: (data) => viewFacility.open(data.id) },
      { label: "Edit Facility", onClick: (data) => addFacility.open(data) },
    ]
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="🏥 Facilities Management"
        subtitle="Healthcare facilities registry · HEFRA validated · Live database records"
      >
        <button className="btn btn-secondary btn-sm">📥 Export CSV</button>
        <button className="btn btn-primary text-white font-black uppercase tracking-widest text-[9px]" onClick={() => addFacility.open()}>
          + Register Facility
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard icon="📊" label="Total" value={data?.totalRegistered?.toLocaleString() ?? "0"} variant="blue" />
        <KpiCard icon="✅" label="Active" value={data?.analytics?.active?.toLocaleString() ?? "0"} variant="green" />
        <KpiCard icon="⏳" label="Pending" value={data?.analytics?.pending?.toLocaleString() ?? "0"} variant="gold" />
        <KpiCard icon="📊" label="Top Rated" value={(data as any)?.topRatedCount || "0"} variant="purple" />
        <KpiCard icon="⭐" label="Rating" value={(data as any)?.avgRating || "0.0"} variant="teal" />
        <KpiCard icon="🚩" label="Rejected" value={data?.analytics?.rejected?.toLocaleString() ?? "0"} variant="red" />
      </div>

      <Tabs value={currentStatus} className="w-full" onValueChange={handleStatusChange}>
        <div className="border-b border-slate-200 mb-5 w-full overflow-hidden">
          <TabsList className="bg-transparent h-auto p-0 flex flex-nowrap gap-0 justify-start w-full overflow-x-auto overflow-y-hidden">
            {[
              { id: "all", label: "All Facilities" },
              { id: "pending", label: "Pending Approval" },
              { id: "active", label: "Active" },
              { id: "inactive", label: "Inactive" },
              { id: "suspended", label: "Suspended" },
              { id: "rejected", label: "Rejected" },
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

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <input
              className="flex-1 min-w-[240px] h-9 px-4 rounded-xl border border-slate-200 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              placeholder="🔍 Search facilities..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                className={cn(
                  "h-9 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                  selectedType === "all" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                )}
                onClick={() => handleTypeChange("all")}
              >
                All Types
              </button>
              {facilityTypes.slice(0, 3).map(({ value }) => (
                <button
                  key={value}
                  className={cn(
                    "h-9 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    selectedType === value ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  )}
                  onClick={() => handleTypeChange(value)}
                >
                  {value.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <DataTable
              columns={facilityColumns}
              data={data?.facilities || []}
              isLoading={isLoading || isFetching}
              onRowClick={(row) => viewFacility.open(row.id)}
              onDeleteSelected={(rows) => console.log("Delete", rows)}
              cardConfig={cardConfig}
              pagination={{
                currentPage: page,
                totalPages: Math.ceil((data?.totalRegistered || 0) / pageSize) || 1,
                totalItems: data?.totalRegistered || 0,
                pageSize: pageSize,
                onPageChange,
                onNextPage,
                onPreviousPage,
                canNextPage: page < (Math.ceil((data?.totalRegistered || 0) / pageSize) || 1),
                canPreviousPage: page > 1,
              }}
            />
          </div>
        </div>
      </Tabs>

      <AddFacilityDialog />
      <FacilityViewDialog />
    </div>
  );
};

export default FacilitiesPage;
