"use client";
import { StatsCard, TableSkeleton } from "@/components/Data-Table/helpers";
import SectionHeader from "@/components/SectionHeader";
import { Input } from "@/components/ui/input";
import { PlusSquare, Search } from "lucide-react";
import React, { useState, useCallback, useMemo } from "react";
import { createPaginationHandlers } from "@/lib/utils";
import { DataTable } from "@/components/Data-Table/data-table";
import {
  discountColumns,
  DiscountType,
} from "@/components/Data-Table/columns/discountColumns";
import {
  useAddDiscountDialog,
  useViewDiscountDialog,
} from "@/stores/dialog-store";
import AddDiscountDialog from "./_components/add-discount-dialog";
import ViewDiscountDialog from "./_components/view-discount-dialog";

const DiscountsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(
    undefined,
  );
  const limit = 10;

  const viewDiscount = useViewDiscountDialog();
  const addDiscount = useAddDiscountDialog();

  // Mock data - replace with actual hook when backend is ready
  const mockData = {
    data: [
      {
        id: "1",
        name: "5%",
        value: 5,
        type: "percentage" as const,
        code: "Ad5",
        usage: "15/500",
        createdAt: "2024-01-15",
      },
    ] as DiscountType[],
    meta: { totalPages: 1, total: 1 },
    analytics: {
      totalDiscounts: 1,
      activeDiscounts: 1,
      expiredDiscounts: 0,
      usage: "15/500",
      totalAmount: "GHS4,300",
    },
  };

  const isLoading = false;

  const onRowClick = useCallback(
    (condition: any) => viewDiscount.open(condition.id),
    [viewDiscount.open],
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
          title="Discounts"
          description="Manage discount codes and promotions."
          Icon={PlusSquare}
          hasButton
          buttonLabel="Create Discount"
          onButtonClick={() => addDiscount.open()}
        />

        {isLoading ? (
          <TableSkeleton />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search discounts by name or code"
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
                label="Active Discounts"
                value={mockData?.analytics?.activeDiscounts || 0}
                onClick={() => handleStatusChange(undefined)}
                active={selectedStatus === undefined}
              />
              <StatsCard
                label="Total Usage"
                value={
                  mockData?.analytics?.usage
                    ? Number(mockData.analytics.usage.split("/")[0])
                    : 0
                }
                variant="success"
                onClick={() => handleStatusChange("active")}
                active={selectedStatus === "active"}
              />
              <StatsCard
                label="Amount Discounted"
                value={Number(mockData?.analytics?.totalAmount) || 0}
                variant="info"
                onClick={() => handleStatusChange("pending")}
                active={selectedStatus === "pending"}
              />
              <StatsCard
                label="Expired"
                value={mockData?.analytics?.expiredDiscounts || 0}
                variant="neutral"
                onClick={() => handleStatusChange("expired")}
                active={selectedStatus === "expired"}
              />
            </div>

            <DataTable
              columns={discountColumns}
              data={mockData?.data || []}
              onRowClick={onRowClick}
              pagination={paginationConfig}
              isLoading={isLoading}
            />
          </>
        )}

        <AddDiscountDialog />
        <ViewDiscountDialog />
      </section>
    </div>
  );
};

export default DiscountsPage;
