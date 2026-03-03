"use client";

import React, { useMemo, useState } from "react";
import {
  Hospital,
  Loader2,
  PlusCircleIcon,
  SquareArrowOutUpRight,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import SectionHeader from "@/components/SectionHeader";
import { StatsCard } from "@/components/Data-Table/helpers";
import { DataTable } from "@/components/Data-Table/data-table";
import { facilityColumns } from "@/components/Data-Table/columns/facilityColumns";
import { useFacilityCardConfig } from "@/components/Data-Table/mobile-table-configs/facilityCardConfig";
import { createPaginationHandlers } from "@/lib/utils";
import { useFacilityProfiles } from "@/hooks/supabase-calls/useFacilities";

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
  const facilityCardConfig = useFacilityCardConfig();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [page, setPage] = useState(1);
  const limit = 10;
  const currentStatus = searchParams.get("status");

  const { data, isLoading, isFetching } = useFacilityProfiles({
    limit,
    page,
    includeStatsOnly: currentStatus === null,
    status: currentStatus || undefined,
  });

  const handleStatusChange = (status) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status) params.set("status", status);
    else params.delete("status");
    setPage(1);
    router.push(`?${params.toString()}`);
  };

  const facilitiesPagination = useMemo(
    () => createPaginationHandlers(page, setPage, data?.meta?.totalPages),
    [page, data?.meta?.totalPages],
  );

  const pagination = useMemo(
    () => ({
      currentPage: page,
      totalPages: data?.meta?.totalPages || 1,
      totalItems: data?.meta?.total || 0,
      pageSize: limit,
      onPageChange: facilitiesPagination.goTo,
      onNextPage: facilitiesPagination.next,
      onPreviousPage: facilitiesPagination.previous,
      canNextPage: page < (data?.meta?.totalPages || 1),
      canPreviousPage: page > 1,
    }),
    [page, data, facilitiesPagination],
  );

  const facilityTypes = useMemo(
    () =>
      Object.entries(data?.typeCounts || {})
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value.localeCompare(b.value)),
    [data?.typeCounts],
  );

  return (
    <section className="mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-10 max-w-[2400px] bg-white shadow-sm mt-2 rounded-lg">
      <div className="mb-5">
        <SectionHeader
          title="Facilities"
          description=""
          Icon={PlusCircleIcon}
          hasButton={false}
        />

        {isLoading ? (
          <div className="w-full h-30 flex items-center justify-center gap-2">
            <Loader2 size={24} className="animate-spin" />
            Loading Facilities...
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatsCard
              label="Total Registered"
              value={data?.meta?.total || 0}
              onClick={() => handleStatusChange(null)}
              active={!currentStatus}
            />
            <StatsCard
              label="Active"
              value={data?.analytics?.active || 0}
              variant="success"
              onClick={() => handleStatusChange("active")}
              active={currentStatus === "active"}
            />
            <StatsCard
              label="Pending"
              value={data?.analytics?.pending || 0}
              variant="warning"
              onClick={() => handleStatusChange("pending")}
              active={currentStatus === "pending"}
            />
            <StatsCard
              label="Inactive"
              value={data?.analytics?.inactive || 0}
              variant="neutral"
              onClick={() => handleStatusChange("inactive")}
              active={currentStatus === "inactive"}
            />
            <StatsCard
              label="Rejected"
              value={data?.analytics?.rejected || 0}
              variant="red"
              onClick={() => handleStatusChange("rejected")}
              active={currentStatus === "rejected"}
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-1">
          {facilityTypes.map(({ value, count }) => (
            <FacilityCard
              key={value}
              label={formatFacilityType(value)}
              count={count}
              link={`/facilities/${encodeURIComponent(value)}`}
              Icon={Hospital}
            />
          ))}
        </div>
      </div>

      {currentStatus && (
        <DataTable
          columns={facilityColumns}
          data={data?.facilities || []}
          cardConfig={facilityCardConfig}
          onRowClick={(facility) =>
            router.push(`/view-facility-profile?id=${facility.id}`)
          }
          pagination={pagination}
          isLoading={isFetching}
        />
      )}
    </section>
  );
};

export default FacilitiesPage;

const FacilityCard = ({ label, count, link, Icon }) => {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(link)}
      className="group relative flex items-center gap-4 p-4 rounded-2xl border-2 border-emerald-600 bg-white hover:border-green-200 hover:bg-green-50/50 hover:shadow-sm transition-all duration-300 ease-in-out text-left w-full"
    >
      <div className="flex items-center justify-center shrink-0 size-14 rounded-xl bg-green-50 group-hover:bg-green-100 transition-colors duration-300">
        <Icon className="h-6 w-6 text-green-600 group-hover:text-green-700" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-sm text-gray-900 truncate">
            {label}
          </h3>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-green-100 px-1.5 text-[10px] font-semibold text-green-700">
            {count}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-500">
          <SquareArrowOutUpRight
            size={14}
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          />
          <span className="text-[10px] uppercase tracking-wider font-medium truncate">
            View {label}
          </span>
        </div>
      </div>
    </button>
  );
};
