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
import { useMarketingDiscounts } from "@/hooks/supabase-calls/useDiscounts";

const DiscountsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(
    undefined,
  );
  const limit = 10;

  const viewDiscount = useViewDiscountDialog();
  const addDiscount = useAddDiscountDialog();
  const { data, isLoading, isError, error } = useMarketingDiscounts({
    page,
    limit,
    search: searchTerm || undefined,
    activeOnly: selectedStatus === "active",
  });

  const tableData = useMemo<DiscountType[]>(() => {
    const discounts = data?.data || [];
    const now = Date.now();

    const filteredDiscounts = discounts.filter((discount) => {
      if (selectedStatus === "active") return discount.isActive;
      if (selectedStatus === "expired") {
        return !!discount.validUntil && new Date(discount.validUntil).getTime() < now;
      }
      return true;
    });

    return filteredDiscounts.map((discount: any) => ({
      id: discount.id,
      name: discount.name,
      discount_value: discount.discount_value,
      type: discount.discount_type,
      code: discount.code,
      usage: discount.max_uses
        ? `${discount.current_uses || 0}/${discount.max_uses}`
        : `${discount.current_uses || 0}`,
      createdAt: discount.createdAt,
      updatedAt: discount.updatedAt,
    }));
  }, [data, selectedStatus]);

  const analytics = useMemo(() => {
    const now = Date.now();
    const discounts = data?.data || [];

    const totalUsage = discounts.reduce(
      (sum, discount) => sum + (discount.currentUses || 0),
      0,
    );

    const totalAmount = discounts.reduce((sum, discount) => {
      return sum + (discount.discountValue || 0) * (discount.currentUses || 0);
    }, 0);

    return {
      totalDiscounts: data?.meta?.total || 0,
      activeDiscounts: discounts.filter((discount) => discount.isActive).length,
      expiredDiscounts: discounts.filter(
        (discount) =>
          !!discount.validUntil && new Date(discount.validUntil).getTime() < now,
      ).length,
      totalUsage,
      totalAmount,
    };
  }, [data]);

  const onRowClick = useCallback(
    (condition: any) => viewDiscount.open(condition.id),
    [viewDiscount.open],
  );

  const pagination = useMemo(
    () =>
      createPaginationHandlers(page, setPage, data?.meta?.totalPages || 1),
    [page, data?.meta?.totalPages],
  );

  const paginationConfig = useMemo(
    () => ({
      currentPage: page,
      totalPages: data?.meta?.totalPages || 1,
      totalItems: data?.meta?.total || 0,
      pageSize: limit,
      onPageChange: pagination.goTo,
      onNextPage: pagination.next,
      onPreviousPage: pagination.previous,
      canNextPage: page < (data?.meta?.totalPages || 1),
      canPreviousPage: page > 1,
    }),
    [page, data, pagination],
  );

  const handleStatusChange = (status: string | undefined) => {
    setSelectedStatus(status);
    setPage(1);
  };

  console.log("Discount: ", data?.data)

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
                label="Total Discounts"
                value={analytics.totalDiscounts}
                onClick={() => handleStatusChange(undefined)}
                active={selectedStatus === undefined}
              />
              <StatsCard
                label="Total Usage"
                value={analytics.totalUsage}
                variant="success"
                onClick={() => handleStatusChange("active")}
                active={selectedStatus === "active"}
              />
              <StatsCard
                label="Amount Discounted"
                value={analytics.totalAmount}
                variant="info"
                onClick={() => handleStatusChange(undefined)}
                active={false}
              />
              <StatsCard
                label="Expired"
                value={analytics.expiredDiscounts}
                variant="neutral"
                onClick={() => handleStatusChange("expired")}
                active={selectedStatus === "expired"}
              />
            </div>

            <DataTable
              columns={discountColumns}
              data={tableData}
              onRowClick={onRowClick}
              pagination={paginationConfig}
              isLoading={isLoading}
              isError={isError}
              error={error}
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
