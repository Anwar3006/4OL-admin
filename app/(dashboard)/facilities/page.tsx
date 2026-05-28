"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";
import { Loader2 } from "lucide-react";

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
      key: "name",
      label: "Facility",
      render: (val: string, row: any) => (
        <div>
          <div className="font-bold text-slate-800">{val}</div>
          <div className="text-[10px] text-slate-400">{row.address || "No address provided"}</div>
        </div>
      )
    },
    {
      key: "type",
      label: "Type",
      render: (val: string) => (
        <span className="badge badge-blue">🏥 {formatFacilityType(val)}</span>
      )
    },
    {
      key: "region",
      label: "Region",
      render: (val: string) => <span className="text-[11px] text-slate-600 font-medium">{val || "Greater Accra"}</span>
    },
    {
      key: "hefra_verified",
      label: "HEFRA",
      render: (val: boolean) => (
        <span className={cn("badge", val ? "badge-green" : "badge-amber")}>
          {val ? "✅ Verified" : "Pending"}
        </span>
      )
    },
    {
      key: "phone",
      label: "Contact",
      render: (val: string) => <span className="td-s">{val || "N/A"}</span>
    },
    {
      key: "plan",
      label: "Plan",
      render: (val: string) => <span className="badge badge-purple">{val || "Standard"}</span>
    },
    {
      key: "rating",
      label: "Rating",
      render: (val: number) => (
        <span className="font-bold text-ek-gold text-[11px]">{val || "4.5"} ⭐</span>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (val: string) => (
        <span className={cn(
          "badge",
          val === 'active' ? 'badge-green' : 
          val === 'pending' ? 'badge-amber' : 'badge-red'
        )}>
          {val === 'active' ? '✅ Active' : val === 'pending' ? '⏳ Pending' : 'Suspended'}
        </span>
      )
    }
  ];

  const rowActions = [
    { label: "View", icon: "👁️", onClick: (row: any) => viewFacility.open(row.id) },
    { label: "Edit", icon: "✏️", onClick: (row: any) => console.log('Edit', row) },
    { label: "Delete", icon: "🗑️", onClick: (row: any) => console.log('Delete', row), danger: true },
  ];

  const facilityTypes = useMemo(() => {
    const counts = data?.typeCounts || {};
    return Object.entries(counts)
      .map(([value, count]) => ({ value, count: count as number }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [data?.typeCounts]);

  return (
    <div className="animate-in fade-in duration-500">
      <PageHeader
        title="🏥 Facilities Management"
        subtitle="Healthcare facilities registry · HEFRA validated · 1,310 total registered across Ghana"
      >
        <button className="btn btn-secondary">📥 Export CSV</button>
        <button className="btn btn-secondary">📋 View Map</button>
        <button className="btn btn-secondary bg-ek-amber-light text-ek-amber border-ek-amber/20" onClick={() => handleStatusChange("pending")}>
          ? Review Pending (23)
        </button>
        <button className="btn btn-primary" onClick={() => addFacility.open()}>+ Register Facility</button>
      </PageHeader>

      {/* SA Alert Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-xl p-3.5 mb-4 flex items-center gap-3.5 shadow-lg shadow-indigo-100">
        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 animate-pulse"></div>
        <div className="flex-1 text-[11px] text-white/90">
          <strong className="text-white">23 Facilities Awaiting Super Admin Approval</strong> — Only Super Admin can approve or reject facility submissions by Field Data Collectors. Facilities are hidden from users until approved.
        </div>
        <button className="btn btn-sm bg-white/15 text-white border-white/30 hover:bg-white/25">? Review Now</button>
      </div>

      <div className="alert al-in mb-4">
        <div className="al-ic">⚠️</div>
        <div className="text-slate-600">
          <strong>IBP Advisory:</strong> Independent Business Partners (IBPs) are managed separately under <b>Users · IBP Businesses</b>. This registry covers licensed <b>healthcare facilities</b> only.
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-5">
        <KpiCard
          icon="📊"
          label="Total Registered"
          value={data?.totalRegistered?.toLocaleString() || "1,310"}
          variant="blue"
          delta="+23 pending"
          deltaType="up"
        />
        <KpiCard
          icon="✅"
          label="Active"
          value={data?.analytics?.active?.toLocaleString() || "1,287"}
          variant="green"
          delta="+5.2% month"
          deltaType="up"
        />
        <KpiCard
          icon="⏳"
          label="Pending Approval"
          value={data?.analytics?.pending?.toLocaleString() || "23"}
          variant="gold"
          delta="SA Only"
        />
        <KpiCard
          icon="📊"
          label="Top Rated"
          value="3"
          variant="purple"
          delta="Visible in-app"
        />
        <KpiCard
          icon="⭐"
          label="Avg. Rating"
          value="4.4"
          variant="teal"
          delta="+0.1 month"
          deltaType="up"
        />
        <KpiCard
          icon="🚩"
          label="Rejected"
          value={data?.analytics?.rejected?.toLocaleString() || "3"}
          variant="red"
          delta="Needs review"
          deltaType="down"
        />
      </div>

      {/* Facility Type Pills */}
      <div className="pill-nav mb-5 overflow-x-auto no-scrollbar pb-1">
        <div 
          className={cn("pill cursor-pointer", selectedType === "all" && "active")}
          onClick={() => setSelectedType("all")}
        >
          All Types
        </div>
        {facilityTypes.map(({ value, count }) => (
          <div 
            key={value} 
            className={cn("pill flex items-center gap-1.5 whitespace-nowrap cursor-pointer", selectedType === value && "active")}
            onClick={() => setSelectedType(value)}
          >
            <span>📋</span>
            {formatFacilityType(value)}
            <span className="text-[9px] opacity-60 font-black ml-1">{count}</span>
          </div>
        ))}
      </div>

      {/* Status Tabs */}
      <Tabs value={currentStatus} className="w-full" onValueChange={handleStatusChange}>
        <div className="tabs mb-4 overflow-x-auto no-scrollbar">
          <TabsList className="bg-transparent h-auto p-0 flex gap-0">
            {[
              { id: "all", label: "All Facilities", icon: "🏥" },
              { id: "pending", label: "Pending Approval", icon: "⏳", badge: "23" },
              { id: "active", label: "Active", icon: "✅" },
              { id: "inactive", label: "Inactive", icon: "💤" },
              { id: "suspended", label: "Suspended", icon: "🚫" },
              { id: "rejected", label: "Rejected", icon: "❌" },
              { id: "top_rated", label: "Top Rated", icon: "⭐", badge: "3", badgeColor: "bg-ek-purple" },
              { id: "featured", label: "Featured", icon: "📌", badge: "4", badgeColor: "bg-ek-indigo" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "tab transition-all duration-150 data-[state=active]:active data-[state=active]:text-ek-green-dark data-[state=active]:border-b-3 data-[state=active]:border-ek-green-dark",
                )}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
                {tab.badge && (
                  <span className={cn(
                    "ml-2 px-1.5 py-0 rounded-full text-[9px] font-black text-white min-w-[16px] text-center",
                    tab.badgeColor || "bg-ek-orange"
                  )}>
                    {tab.badge}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="mt-4">
           <div className="card mb-4">
            <div className="fbar p-0 m-0">
              <div className="relative flex-1 min-w-[240px]">
                <input 
                  className="fi fi-s w-full pl-8" 
                  placeholder="🔍 Search by name, type, region, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select className="fi"><option>All Regions</option></select>
              <select className="fi"><option>All Plans</option></select>
              <select className="fi"><option>All Ratings</option></select>
              <button className="btn btn-secondary">📥 Export</button>
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <DataTable
              columns={columns}
              data={data?.facilities || []}
              rowActions={rowActions}
              selectable
              itemsPerPage={limit}
              // isLoading={isLoading || isFetching}
            />
          </div>

          <div className="flex gap-2 mt-4">
            <button className="btn btn-secondary text-[11px] font-bold">✅ Approve Selected</button>
            <button className="btn btn-secondary text-[11px] font-bold">📥 Export</button>
            <button className="btn btn-secondary text-[11px] font-bold">⭐ Feature</button>
            <button className="btn btn-danger text-[11px] font-bold">🚫 Suspend</button>
          </div>
        </div>
      </Tabs>

      <AddFacilityDialog />
      <FacilityViewDialog />
    </div>
  );
};

export default FacilitiesPage;
