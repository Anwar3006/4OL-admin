"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  ArrowLeft,
  Loader2,
  PlusCircleIcon,
  Search,
  Filter,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import SectionHeader from "@/components/SectionHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/Data-Table/helpers";
import { DataTable } from "@/components/Data-Table/data-table";
import { facilityColumns } from "@/components/Data-Table/columns/facilityColumns";
import { useFacilityCardConfig } from "@/components/Data-Table/mobile-table-configs/facilityCardConfig";
import { createPaginationHandlers } from "@/lib/utils";
import { useFacilityProfiles } from "@/hooks/supabase-calls/useFacilities";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useAddFacilityDialog,
  useViewFacilityDialog,
} from "@/stores/dialog-store";
import AddFacilityDialog from "../_components/add-facility-dialog";
import FacilityViewDialog from "../_components/view-facility-dialog";

const formatFacilityType = (rawType = "") =>
  rawType
    .replace(/_/g, " ")
    .replace(/\//g, " / ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const FacilityTypePage = () => {
  const params = useParams();
  const decodedType = decodeURIComponent(params?.type || "");

  const router = useRouter();
  const searchParams = useSearchParams();
  const facilityCardConfig = useFacilityCardConfig();
  const addFacility = useAddFacilityDialog();
  const viewFacility = useViewFacilityDialog();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;
  const currentStatus = searchParams.get("status");

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, currentStatus]);

  const { data, isLoading, isFetching } = useFacilityProfiles({
    limit,
    page,
    type: decodedType,
    search: debouncedSearch,
    includeStatsOnly: false,
    status: currentStatus || undefined,
  });

  const handleStatusChange = (status) => {
    const paramsObj = new URLSearchParams(searchParams.toString());
    if (status) paramsObj.set("status", status);
    else paramsObj.delete("status");
    setPage(1);
    router.push(`?${paramsObj.toString()}`);
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

  const onRowClick = useCallback(
    (facility) => viewFacility.open(facility.id),
    [viewFacility],
  );

  return (
    <section className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px]">
      <Button
        variant="outline"
        className="mb-4"
        onClick={() => router.push("/facilities")}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Facilities
      </Button>

      <SectionHeader
        title={formatFacilityType(decodedType)}
        Icon={PlusCircleIcon}
        description={`Manage ${formatFacilityType(decodedType)} facilities`}
        hasButton={true}
        buttonLabel="Add Facility"
        onButtonClick={() => addFacility.open()}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search facilities..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {isLoading ? (
        <div className="w-full h-30 flex items-center justify-center gap-2">
          <Loader2 size={24} className="animate-spin" />
          Loading Facilities...
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatsCard
            label="Total Registered"
            value={data?.totalRegistered || 0}
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

      <DataTable
        columns={facilityColumns}
        data={data?.facilities || []}
        cardConfig={facilityCardConfig}
        onRowClick={onRowClick}
        pagination={pagination}
        isLoading={isFetching}
      />

      <AddFacilityDialog />
      <FacilityViewDialog />
    </section>
  );
};

export default FacilityTypePage;
