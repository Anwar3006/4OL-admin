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
import { subscriptionColumns } from "@/components/Data-Table/columns/subscriptionColumns";
import {
  useDeleteMarketingSubscription,
  useMarketingSubscriptions,
} from "@/hooks/supabase-calls/useSubscriptions";
import { TMarketingSubscriptionOutput } from "@/schemas/marketing-subscription.schema";

const SubscriptionsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(
    undefined,
  );
  const limit = 10;
  const viewSubscription = useViewSubscriptionDialog();
  const addSubscriptions = useAddSubscriptionDialog();
  const { data, isLoading } = useMarketingSubscriptions({
    page,
    limit,
    search: searchTerm || undefined,
    activeOnly: selectedStatus === "active",
  });
  const { mutate: deleteSubscription } = useDeleteMarketingSubscription();

  const onRowClick = useCallback(
    (condition: any) => viewSubscription.open(condition.id),
    [viewSubscription.open],
  );

  const handleEdit = useCallback(
    (row: TMarketingSubscriptionOutput) => addSubscriptions.open(row),
    [addSubscriptions],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (
        window.confirm("Are you sure you want to delete this subscription?")
      ) {
        deleteSubscription(id);
      }
    },
    [deleteSubscription],
  );

  const filteredData = useMemo(() => {
    const subscriptions = data?.data || [];
    if (selectedStatus === "inactive") {
      return subscriptions.filter((item) => !item.isActive);
    }
    return subscriptions;
  }, [data?.data, selectedStatus]);

  const analytics = useMemo(() => {
    const subscriptions = data?.data || [];
    return {
      total: data?.meta?.total || 0,
      active: subscriptions.filter((item) => item.isActive).length,
      inactive: subscriptions.filter((item) => !item.isActive).length,
    };
  }, [data]);

  const columns = subscriptionColumns.map((col) => {
    if (col.id === "actions") {
      return {
        ...col,
        cell: ({ row }: any) => {
          const subscription = row.original;
          return (
            <div className="flex items-center justify-end gap-2">
              <button
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  viewSubscription.open(subscription.id);
                }}
              >
                👁️
              </button>
              <button
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(subscription);
                }}
              >
                ✏️
              </button>
              <button
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(subscription.id);
                }}
              >
                🗑️
              </button>
            </div>
          );
        },
      };
    }
    return col;
  });

  const pagination = useMemo(
    () => createPaginationHandlers(page, setPage, data?.meta?.totalPages || 1),
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

        {isLoading ? (
          <TableSkeleton />
        ) : (
          <>
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
                value={analytics.total}
                onClick={() => handleStatusChange(undefined)}
                active={selectedStatus === undefined}
              />
              <StatsCard
                label="Active"
                value={analytics.active}
                variant="success"
                onClick={() => handleStatusChange("active")}
                active={selectedStatus === "active"}
              />
              <StatsCard
                label="Inactive"
                value={analytics.inactive}
                variant="neutral"
                onClick={() => handleStatusChange("inactive")}
                active={selectedStatus === "inactive"}
              />
              <StatsCard
                label="Privileges"
                value={filteredData.reduce(
                  (sum, item) => sum + (item.privileges?.length || 0),
                  0,
                )}
                variant="warning"
                onClick={() => handleStatusChange(undefined)}
                active={false}
              />
            </div>

            <DataTable
              columns={columns}
              data={filteredData}
              onRowClick={onRowClick}
              pagination={paginationConfig}
              isLoading={isLoading}
            />
          </>
        )}

        <AddSubscriptionDialog />
        <ViewSubscriptionDialog />
      </section>
    </div>
  );
};

export default SubscriptionsPage;
