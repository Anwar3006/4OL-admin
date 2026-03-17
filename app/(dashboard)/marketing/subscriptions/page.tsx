"use client";
import { StatsCard, TableSkeleton } from "@/components/Data-Table/helpers";
import SectionHeader from "@/components/SectionHeader";
import { Input } from "@/components/ui/input";
import { PlusSquare, Search } from "lucide-react";
import React, { useState, useCallback, useMemo } from "react";
import { createPaginationHandlers } from "@/lib/utils";
import { DataTable } from "@/components/Data-Table/data-table";
import {
  useAddSubscriptionDialog,
  useViewSubscriptionDialog,
} from "@/stores/dialog-store";
import ViewSubscriptionDialog from "./_components/view-subscription-dialog";
import AddSubscriptionDialog from "./_components/add-subscription-dialog";

const SubscriptionsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(
    undefined,
  );
  const limit = 10;
  const viewSubscription = useViewSubscriptionDialog();
  const addSubscriptions = useAddSubscriptionDialog();

  // Mock data structure - replace with actual hook when backend is ready
  const mockData = {
    data: [],
    meta: { totalPages: 1, total: 0 },
    analytics: {
      active: 0,
      inactive: 0,
      pending: 0,
    },
  };

  const onRowClick = useCallback(
    (condition: any) => viewSubscription.open(condition.id),
    [viewSubscription.open],
  );

  const pagination = useMemo(
    () =>
      createPaginationHandlers(page, setPage, mockData?.meta?.totalPages || 1),
    [page],
  );

  const paginationConfig = useMemo(
    () => ({
      currentPage: page,
      totalPages: mockData?.meta?.totalPages || 1,
      totalItems: mockData?.meta?.total || 0,
      pageSize: limit,
      onPageChange: pagination.goTo,
      onNextPage: pagination.next,
      onPreviousPage: pagination.previous,
      canNextPage: page < (mockData?.meta?.totalPages || 1),
      canPreviousPage: page > 1,
    }),
    [page, mockData, pagination],
  );

  const handleStatusChange = (status: string | undefined) => {
    setSelectedStatus(status);
    setPage(1);
  };

  return (
    <div className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px] bg-white shadow-sm mt-2 rounded-lg">
      <section>
        <SectionHeader
          title="Subscriptions"
          description="Manage subscription plans and user subscriptions."
          Icon={PlusSquare}
          hasButton
          buttonLabel="Add Subscription"
          onButtonClick={() => addSubscriptions.open()}
        />

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search subscriptions"
              className="pl-9 w-full"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard
            label="Total Subscriptions"
            value={mockData?.analytics?.active || 0}
            onClick={() => handleStatusChange(undefined)}
            active={selectedStatus === undefined}
          />
          <StatsCard
            label="Active"
            value={mockData?.analytics?.active || 0}
            variant="success"
            onClick={() => handleStatusChange("active")}
            active={selectedStatus === "active"}
          />
          <StatsCard
            label="Inactive"
            value={mockData?.analytics?.inactive || 0}
            variant="neutral"
            onClick={() => handleStatusChange("inactive")}
            active={selectedStatus === "inactive"}
          />
          <StatsCard
            label="Pending"
            value={mockData?.analytics?.pending || 0}
            variant="warning"
            onClick={() => handleStatusChange("pending")}
            active={selectedStatus === "pending"}
          />
        </div>

        <DataTable
          columns={[]}
          data={mockData?.data || []}
          onRowClick={onRowClick}
          pagination={paginationConfig}
          isLoading={false}
        />

        <AddSubscriptionDialog />
        <ViewSubscriptionDialog />
      </section>
    </div>
  );
};

export default SubscriptionsPage;
