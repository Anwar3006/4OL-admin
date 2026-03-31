"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Star, Loader2, Search, Filter } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import SectionHeader from "@/components/SectionHeader";
import { DataTable } from "@/components/Data-Table/data-table";
import { featuredFacilityColumns } from "@/components/Data-Table/columns/featuredFacilityColumns";
import { createPaginationHandlers } from "@/lib/utils";
import { useFeaturedFacilities } from "@/hooks/supabase-calls/useFacilities";
import { useFacilityToggleDialog } from "@/stores/dialog-store";
import FacilityToggleModal from "../_components/facility-toggle-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const FeaturedFacilitiesPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;

  const toggleDialog = useFacilityToggleDialog();

  const { data, isLoading } = useFeaturedFacilities({ page, limit, search: debouncedSearch });

  // Reset page when search changes
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const facilitiesPagination = useMemo(
    () => createPaginationHandlers(page, setPage, data?.meta?.totalPages ?? 1),
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

  const handleRowClick = useCallback(
    (row) => {
      toggleDialog.open(row);
    },
    [toggleDialog],
  );

  return (
    <section className="mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-6 max-w-[2400px] bg-white shadow-sm mt-2 rounded-lg">
      <SectionHeader
        title="Featured Facilities"
        description="Manage featured and promoted healthcare facilities"
        Icon={Star}
        hasButton={false}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or region..."
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

      {/* Stats bar */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Star className="h-4 w-4 text-amber-500" />
        <span>
          <strong className="text-foreground">{data?.meta?.total ?? 0}</strong>{" "}
          featured {data?.meta?.total === 1 ? "facility" : "facilities"}
          {debouncedSearch && ` matching "${debouncedSearch}"`}
        </span>
      </div>

      <DataTable
        columns={featuredFacilityColumns}
        data={data?.facilities || []}
        pagination={pagination}
        isLoading={isLoading}
        onRowClick={handleRowClick}
      />

      <FacilityToggleModal />
    </section>
  );
};

export default FeaturedFacilitiesPage;
