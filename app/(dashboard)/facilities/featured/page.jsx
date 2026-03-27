"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Star, Loader2, Search } from "lucide-react";
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
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const limit = 10;

  const toggleDialog = useFacilityToggleDialog();

  const { data, isLoading } = useFeaturedFacilities({ page, limit, search });

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

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

      {/* Search */}
      <div className="flex items-center gap-2 max-w-md">
        <Input
          placeholder="Search by name or region..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-9"
        />
        <Button size="sm" onClick={handleSearch} className="gap-1.5 shrink-0">
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Star className="h-4 w-4 text-amber-500" />
        <span>
          <strong className="text-foreground">{data?.meta?.total ?? 0}</strong>{" "}
          featured {data?.meta?.total === 1 ? "facility" : "facilities"}
          {search && ` matching "${search}"`}
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
