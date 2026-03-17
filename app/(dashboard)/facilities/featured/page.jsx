"use client";

import React, { useMemo, useState } from "react";
import { Hospital, Loader2, Star } from "lucide-react";

import SectionHeader from "@/components/SectionHeader";
import { StatsCard } from "@/components/Data-Table/helpers";
import { DataTable } from "@/components/Data-Table/data-table";
import { facilityColumns } from "@/components/Data-Table/columns/facilityColumns";
import { createPaginationHandlers } from "@/lib/utils";

const FeaturedFacilitiesPage = () => {
  const [page, setPage] = useState(1);
  const limit = 10;

  // Mock data - replace with actual hook when backend is ready
  const mockData = {
    data: [],
    meta: { totalPages: 1, total: 0 },
    totalRegistered: 0,
    analytics: {
      active: 0,
      pending: 0,
      inactive: 0,
      rejected: 0,
    },
    typeCounts: {},
  };

  const isLoading = false;

  const facilitiesPagination = useMemo(
    () => createPaginationHandlers(page, setPage, mockData?.meta?.totalPages),
    [page, mockData?.meta?.totalPages],
  );

  const pagination = useMemo(
    () => ({
      currentPage: page,
      totalPages: mockData?.meta?.totalPages || 1,
      totalItems: mockData?.meta?.total || 0,
      pageSize: limit,
      onPageChange: facilitiesPagination.goTo,
      onNextPage: facilitiesPagination.next,
      onPreviousPage: facilitiesPagination.previous,
      canNextPage: page < (mockData?.meta?.totalPages || 1),
      canPreviousPage: page > 1,
    }),
    [page, mockData, facilitiesPagination],
  );

  return (
    <section className="mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-10 max-w-[2400px] bg-white shadow-sm mt-2 rounded-lg">
      <div className="mb-5">
        <SectionHeader
          title="Featured Facilities"
          description="View featured and promoted healthcare facilities"
          Icon={Star}
          hasButton={false}
        />

        {isLoading ? (
          <div className="w-full h-30 flex items-center justify-center gap-2">
            <Loader2 size={24} className="animate-spin" />
            Loading Facilities...
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatsCard
              label="Total Featured"
              value={mockData?.totalRegistered || 0}
              onClick={() => {}}
              active={true}
            />
            <StatsCard
              label="Active"
              value={mockData?.analytics?.active || 0}
              variant="success"
              onClick={() => {}}
              active={false}
            />
            <StatsCard
              label="Pending"
              value={mockData?.analytics?.pending || 0}
              variant="warning"
              onClick={() => {}}
              active={false}
            />
            <StatsCard
              label="Inactive"
              value={mockData?.analytics?.inactive || 0}
              variant="neutral"
              onClick={() => {}}
              active={false}
            />
            <StatsCard
              label="Rejected"
              value={mockData?.analytics?.rejected || 0}
              variant="red"
              onClick={() => {}}
              active={false}
            />
          </div>
        )}

        <DataTable
          columns={facilityColumns}
          data={mockData?.data || []}
          pagination={pagination}
          isLoading={isLoading}
        />
      </div>
    </section>
  );
};

export default FeaturedFacilitiesPage;
