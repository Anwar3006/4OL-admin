"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";

import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import DataTable from "@/components/redesign/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useFacilityProfiles } from "@/hooks/supabase-calls/useFacilities";
import {
  useAddFacilityDialog,
  useViewFacilityDialog,
} from "@/stores/dialog-store";

import { FacilityViewDialog } from "./_components/view-facility-dialog";
import AddFacilityDialog from "./_components/add-facility-dialog";

const formatFacilityType = (rawType = "") =>
  rawType
    .replace(/_/g, " ")
    .replace(/\//g, " / ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const FacilitiesPage = () => {
  const addFacility = useAddFacilityDialog();
  const viewFacility = useViewFacilityDialog();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;
  const currentStatus = searchParams.get("status") || "all";

  const { data, isLoading, isFetching } = useFacilityProfiles({
    limit,
    page,
    search: debouncedSearch,
    includeStatsOnly: false,
    status: currentStatus === "all" ? undefined : currentStatus,
    type: selectedType === "all" ? undefined : selectedType,
  });

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status && status !== "all") params.set("status", status);
    else params.delete("status");
    setPage(1);
    router.push(`?${params.toString()}`);
  };

  const columns = [
    {
      key: "facility_name",
      label: "Facility",
      render: (val: string, row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-[10px] text-slate-400 border border-slate-200 uppercase">
             {val?.slice(0, 2)}
          </div>
          <div>
            <div className="font-bold text-slate-800">{val}</div>
            <div className="text-[10px] text-slate-400">{row.facility_name || "No name provided"}</div>
          </div>
        </div>
      ),
    },
    {
      key: "facility_type",
      label: "Type",
      render: (val: string) => (
        <span className="badge badge-blue">🏥 {formatFacilityType(val)}</span>
      ),
    },
    {
      key: "region",
      label: "Region",
      render: (val: string) => (
        <span className="text-[11px] text-slate-600 font-bold uppercase tracking-tight">{val || "Greater Accra"}</span>
      ),
    },
    {
      key: "hefra_verified",
      label: "HEFRA",
      render: (val: boolean) => (
        <span className={cn("badge", val ? "badge-green" : "badge-amber")}>
          {val ? "✅ Verified" : "Pending"}
        </span>
      ),
    },
    {
      key: "contact_number",
      label: "Contact",
      render: (val: string) => <span className="td-s font-bold">{val || "N/A"}</span>,
    },
    {
      key: "subscription_tier",
      label: "Plan",
      render: (val: string) => <span className="badge badge-purple uppercase">{val || "Standard"}</span>,
    },
    {
      key: "rating_average",
      label: "Rating",
      render: (val: number) => (
        <span className="font-black text-ek-gold text-[11px]">{val || "0.0"} ⭐</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (val: string) => (
        <span
          className={cn(
            "badge",
            val === "active" ? "badge-green" : val === "pending" ? "badge-amber" : "badge-red",
          )}
        >
          {val === "active" ? "✅ Active" : val === "pending" ? "⏳ Pending" : val || "Inactive"}
        </span>
      ),
    },
  ];

  const rowActions = [
    { label: "View", icon: "👁️", onClick: (row: any) => viewFacility.open(row.id) },
    { label: "Edit", icon: "✏️", onClick: (row: any) => addFacility.open(row) },
    { label: "Delete", icon: "🗑️", onClick: (row: any) => console.log("Delete", row), danger: true },
  ];

  const facilityTypes = useMemo(() => {
    const counts = data?.typeCounts || {};
    return Object.entries(counts)
      .map(([value, count]) => ({ value, count: count as number }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [data?.typeCounts]);

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="🏥 Facilities Management"
        subtitle="Healthcare facilities registry · HEFRA validated · Live database records"
      >
        <button className="btn btn-secondary">📥 Export CSV</button>
        <button className="btn btn-secondary">📋 View Map</button>
        <button
          className="btn btn-secondary bg-ek-amber-light text-ek-amber border-ek-amber/20"
          onClick={() => handleStatusChange("pending")}
        >
          ⏳ Review Pending ({data?.analytics?.pending ?? 0})
        </button>
        <button className="btn btn-primary" onClick={() => addFacility.open()}>
          + Register Facility
        </button>
      </PageHeader>

      {/* SA Alert Banner */}
      {(data?.analytics?.pending ?? 0) > 0 && (
        <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-xl p-3.5 flex flex-wrap items-center gap-3 shadow-lg shadow-indigo-100">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 animate-pulse" />
          <div className="flex-1 min-w-0 text-[11px] text-white/90">
            <strong className="text-white">{data?.analytics?.pending} Facilities Awaiting Super Admin Approval</strong> —
            Only Super Admin can approve or reject facility submissions. Facilities are hidden from users until approved.
          </div>
          <button className="btn btn-sm bg-white/15 text-white border border-white/30 hover:bg-white/25 cursor-pointer">
            ⚡ Review Now
          </button>
        </div>
      )}

      <div className="alert al-in">
        <div className="al-ic">⚠️</div>
        <div className="text-slate-600 text-xs">
          <strong>IBP Advisory:</strong> Independent Business Partners (IBPs) are managed separately
          under <b>Users · IBP Businesses</b>. This registry covers licensed{" "}
          <b>healthcare facilities</b> only.
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 sm:gap-5 mb-5">
        <KpiCard
          icon="📊"
          label="Total Registered"
          value={data?.totalRegistered?.toLocaleString() ?? "0"}
          variant="blue"
          delta="Real-time"
          deltaType="neutral"
        />
        <KpiCard
          icon="✅"
          label="Active"
          value={data?.analytics?.active?.toLocaleString() ?? "0"}
          variant="green"
          delta="Live records"
          deltaType="up"
        />
        <KpiCard
          icon="⏳"
          label="Pending Approval"
          value={data?.analytics?.pending?.toLocaleString() ?? "0"}
          variant="gold"
          delta="SA Queue"
        />
        <KpiCard icon="📊" label="Top Rated" value={(data as any)?.topRatedCount || "0"} variant="purple" delta="Visible in-app" />
        <KpiCard
          icon="⭐"
          label="Avg. Rating"
          value={(data as any)?.avgRating || "0.0"}
          variant="teal"
          delta="User feedback"
          deltaType="up"
        />
        <KpiCard
          icon="🚩"
          label="Rejected"
          value={data?.analytics?.rejected?.toLocaleString() ?? "0"}
          variant="red"
          delta="Needs review"
          deltaType="down"
        />
      </div>

      <Tabs value={currentStatus} className="w-full" onValueChange={handleStatusChange}>
        <TabsList className="bg-transparent h-auto p-0 flex gap-0 border-b border-slate-200 w-full justify-start rounded-none overflow-x-auto no-scrollbar mb-4">
          {[
            { id: "all", label: "All Facilities", icon: "🏥" },
            { id: "pending", label: "Pending Approval", icon: "⏳", badge: data?.analytics?.pending },
            { id: "active", label: "Active", icon: "✅" },
            { id: "inactive", label: "Inactive", icon: "💤" },
            { id: "suspended", label: "Suspended", icon: "🚫" },
            { id: "rejected", label: "Rejected", icon: "❌" },
            { id: "top_rated", label: "Top Rated", icon: "⭐", badge: (data as any)?.topRatedCount },
            { id: "featured", label: "Featured", icon: "📌" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "px-5 py-3.5 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em]",
                "text-slate-400 border-b-2 border-transparent transition-all rounded-none outline-none cursor-pointer",
                "hover:text-ek-green-dark hover:bg-emerald-50/30",
                "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                "data-[state=active]:text-ek-green-dark data-[state=active]:border-ek-green-dark",
              )}
            >
              <span className="mr-2 text-[14px]">{tab.icon}</span>
              {tab.label}
              {!!tab.badge && (
                <span
                  className={cn(
                    "ml-2 px-2 py-0.5 rounded-full text-[9px] font-black text-white min-w-[20px] text-center shadow-sm",
                    tab.id === 'pending' ? "bg-ek-orange" : "bg-ek-purple",
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="space-y-6">
          {/* Facility Type Pills */}
          <div className="flex flex-wrap gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] border transition-all cursor-pointer shadow-sm",
                selectedType === "all"
                  ? "bg-slate-900 text-white border-slate-900 shadow-slate-200"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50",
              )}
              onClick={() => { setSelectedType("all"); setPage(1); }}
            >
              All Types
            </button>
            {facilityTypes.map(({ value, count }) => (
              <button
                key={value}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] border shadow-sm",
                  "transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer",
                  selectedType === value
                    ? "bg-slate-900 text-white border-slate-900 shadow-slate-200"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                )}
                onClick={() => { setSelectedType(value); setPage(1); }}
              >
                 {formatFacilityType(value)}
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-md text-[8px] font-black transition-colors",
                    selectedType === value ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400",
                  )}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>

          <div className="card p-0 overflow-hidden min-h-[500px] border-slate-200 shadow-xl shadow-slate-100">
             {/* Filter bar */}
            <div className="fbar border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="relative flex-1 min-w-[300px]">
                <input
                  className="fi fi-s w-full pl-10 h-10 rounded-xl"
                  placeholder="🔍 Search by name, type, region, phone…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select className="fi h-10 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest cursor-pointer">
                <option>All Regions</option>
              </select>
              <select className="fi h-10 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest cursor-pointer">
                <option>All Plans</option>
              </select>
              <button className="btn btn-secondary h-10 px-5 font-black uppercase text-[10px] tracking-widest">📥 Export CSV</button>
            </div>

            <DataTable
              columns={columns}
              data={data?.facilities || []}
              rowActions={rowActions}
              selectable
              itemsPerPage={limit}
              isLoading={isLoading || isFetching}
              pagination={true}
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button className="btn btn-secondary font-black uppercase tracking-widest text-[10px] px-5 py-2.5">✅ Approve Selected</button>
            <button className="btn btn-secondary font-black uppercase tracking-widest text-[10px] px-5 py-2.5">⭐ Feature</button>
            <button className="btn btn-danger font-black uppercase tracking-widest text-[10px] px-5 py-2.5">🚫 Suspend</button>
          </div>
        </div>
      </Tabs>

      <AddFacilityDialog />
      <FacilityViewDialog />
    </div>
  );
};

export default FacilitiesPage;
