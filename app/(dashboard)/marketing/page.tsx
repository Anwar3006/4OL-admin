"use client";
import { StatsCard, TableSkeleton } from "@/components/Data-Table/helpers";
import SectionHeader from "@/components/SectionHeader";
import { Input } from "@/components/ui/input";
import { PlusSquare, Search } from "lucide-react";
import React, { useState, useCallback, useMemo } from "react";
import { createPaginationHandlers } from "@/lib/utils";

import { DataTable } from "@/components/Data-Table/data-table";

import {
  useAddMarketingDialog,
  useViewMarketingDialog,
} from "@/stores/dialog-store";
import AddMarketingDialog from "./_components/add-marketing-dialog";
import { useMarketingProfiles } from "@/hooks/supabase-calls/useMarketing";
import { marketingColumns } from "@/components/Data-Table/columns/marketingColumns";
import { ViewMarketingDialog } from "./_components/view-marketing-dialog";
import { marketingCardConfig } from "@/components/Data-Table/mobile-table-configs/marketingCardConfig";

const MarketingPage = () => {
  const addMarket = useAddMarketingDialog();
  const viewMarket = useViewMarketingDialog();

  const [adsSearch, setAdsSearch] = useState("");
  const [adsPage, setAdsPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(
    undefined,
  );
  const limit = 10;

  // Call hook
  const { data: adsData, isLoading } = useMarketingProfiles({
    search: adsSearch,
    page: adsPage,
    limit: limit,
    status: selectedStatus,
  });

  const adsPagination = useMemo(
    () =>
      createPaginationHandlers(adsPage, setAdsPage, adsData?.meta.totalPages),
    [adsPage, adsData?.meta.totalPages],
  );

  const handleStatusChange = (status: string | undefined) => {
    setSelectedStatus(status);
    setAdsPage(1); // Reset to first page
  };

  // ⚡ Bolt Optimization: Memoize props for the `DataTable` component.
  // `useCallback` and `useMemo` prevent these props from being recreated on every render,
  // which would otherwise cause the memoized `DataTable` to re-render unnecessarily.
  const onRowClick = useCallback(
    (campaign: any) => viewMarket.open(campaign.id),
    [viewMarket],
  );

  const pagination = useMemo(
    () => ({
      currentPage: adsPage,
      totalPages: adsData?.meta.totalPages || 1,
      totalItems: adsData?.meta.total || 0,
      pageSize: limit,
      onPageChange: adsPagination.goTo,
      onNextPage: adsPagination.next,
      onPreviousPage: adsPagination.previous,
      canNextPage: adsPage < (adsData?.meta.totalPages || 1),
      canPreviousPage: adsPage > 1,
    }),
    [adsPage, adsData, adsPagination],
  );

  const fetchingAds = false;
  return (
    <div className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px] bg-white shadow-sm mt-2 rounded-lg">
      <section>
        <SectionHeader
          title="Marketing & Advertising"
          description="Manage your marketing and advertising campaigns."
          Icon={PlusSquare}
          hasButton
          buttonLabel="Add Campaign"
          onButtonClick={() => addMarket.open()}
        />

        {fetchingAds ? (
          <TableSkeleton />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by headline or organization"
                  className="pl-9 w-full"
                  value={adsSearch}
                  onChange={(e) => {
                    setAdsSearch(e.target.value);
                    setAdsPage(1);
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatsCard
                label="Total Campaigns"
                value={
                  (adsData?.analytics?.draft || 0) +
                  (adsData?.analytics?.scheduled || 0) +
                  (adsData?.analytics?.live || 0) +
                  (adsData?.analytics?.paused || 0) +
                  (adsData?.analytics?.ended || 0)
                }
                onClick={() => handleStatusChange(undefined)}
                active={selectedStatus === undefined}
              />
              <StatsCard
                label="Draft"
                value={adsData?.analytics?.draft || 0}
                variant="neutral"
                onClick={() => handleStatusChange("draft")}
                active={selectedStatus === "draft"}
              />
              <StatsCard
                label="Scheduled"
                value={adsData?.analytics?.scheduled || 0}
                variant="info"
                onClick={() => handleStatusChange("scheduled")}
                active={selectedStatus === "scheduled"}
              />
              <StatsCard
                label="Live"
                value={adsData?.analytics?.live || 0}
                variant="success"
                onClick={() => handleStatusChange("live")}
                active={selectedStatus === "live"}
              />
              <StatsCard
                label="Paused"
                value={adsData?.analytics?.paused || 0}
                variant="warning"
                onClick={() => handleStatusChange("paused")}
                active={selectedStatus === "paused"}
              />
              <StatsCard
                label="Ended"
                value={adsData?.analytics?.ended || 0}
                variant="red"
                onClick={() => handleStatusChange("ended")}
                active={selectedStatus === "ended"}
              />
            </div>

            <DataTable
              columns={marketingColumns}
              data={adsData?.data || []}
              cardConfig={marketingCardConfig}
              onRowClick={onRowClick}
              pagination={pagination}
              isLoading={isLoading}
            />
          </>
        )}

        <ViewMarketingDialog />
        <AddMarketingDialog />
      </section>
    </div>
  );
};

export default MarketingPage;
