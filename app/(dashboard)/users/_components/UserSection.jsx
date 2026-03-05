"use client";

import { useState, useMemo } from "react";
import { Search, Filter, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/Data-Table/data-table";
import {
  ErrorState,
  StatsCard,
  TableSkeleton,
} from "@/components/Data-Table/helpers";
import SectionHeader from "@/components/SectionHeader";
import { userColumns } from "@/components/Data-Table/columns/userColumns";
import { userCardConfig } from "@/components/Data-Table/mobile-table-configs/userCardConfig";
import { createPaginationHandlers } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useUsers } from "@/hooks/supabase-calls/useUser";
import { useViewUserDialog } from "@/stores/dialog-store";

export default function UserSection() {
  const viewDialog = useViewUserDialog();
  const [customerPage, setCustomerPage] = useState(1);
  const [providerPage, setProviderPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const limit = 10;

  // Customers Query
  const { 
    data: customerData, 
    isLoading: isCustomerLoading, 
    isFetching: isCustomerFetching, 
    error: customerError 
  } = useUsers({
    page: customerPage,
    limit,
    search: debouncedSearch,
    admin: false,
    userType: "customer"
  });

  // Business Providers Query
  const { 
    data: providerData, 
    isLoading: isProviderLoading, 
    isFetching: isProviderFetching, 
    error: providerError 
  } = useUsers({
    page: providerPage,
    limit,
    search: debouncedSearch,
    admin: false,
    userType: "business_provider"
  });

  const customerPaginationHandlers = useMemo(
    () => createPaginationHandlers(customerPage, setCustomerPage, customerData?.meta.totalPages),
    [customerPage, customerData?.meta.totalPages]
  );

  const providerPaginationHandlers = useMemo(
    () => createPaginationHandlers(providerPage, setProviderPage, providerData?.meta.totalPages),
    [providerPage, providerData?.meta.totalPages]
  );

  const customerPagination = useMemo(
    () => ({
      currentPage: customerPage,
      totalPages: customerData?.meta.totalPages || 1,
      totalItems: customerData?.meta.total || 0,
      pageSize: limit,
      onPageChange: customerPaginationHandlers.goTo,
      onNextPage: customerPaginationHandlers.next,
      onPreviousPage: customerPaginationHandlers.previous,
      canNextPage: customerPage < (customerData?.meta.totalPages || 1),
      canPreviousPage: customerPage > 1,
    }),
    [customerPage, customerData, customerPaginationHandlers]
  );

  const providerPagination = useMemo(
    () => ({
      currentPage: providerPage,
      totalPages: providerData?.meta.totalPages || 1,
      totalItems: providerData?.meta.total || 0,
      pageSize: limit,
      onPageChange: providerPaginationHandlers.goTo,
      onNextPage: providerPaginationHandlers.next,
      onPreviousPage: providerPaginationHandlers.previous,
      canNextPage: providerPage < (providerData?.meta.totalPages || 1),
      canPreviousPage: providerPage > 1,
    }),
    [providerPage, providerData, providerPaginationHandlers]
  );

  if (isCustomerLoading || isProviderLoading) return <TableSkeleton />;
  if (customerError || providerError) return <ErrorState error={customerError?.message || providerError?.message} onRetry={() => {
    setCustomerPage(1);
    setProviderPage(1);
  }} />;

  return (
    <section className="space-y-10">
      <div>
        <SectionHeader
          title="Users"
          description="Manage your mobile app users"
          Icon={Users}
          hasButton={false}
        />

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCustomerPage(1);
                setProviderPage(1);
              }}
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard label="Total App Users" value={(customerData?.meta.total || 0) + (providerData?.meta.total || 0)} />
          <StatsCard label="Active" value={(customerData?.analytics?.active || 0) + (providerData?.analytics?.active || 0)} variant="success" />
          <StatsCard label="Pending" value={(customerData?.analytics?.pending || 0) + (providerData?.analytics?.pending || 0)} variant="warning" />
          <StatsCard label="Inactive" value={(customerData?.analytics?.inactive || 0) + (providerData?.analytics?.inactive || 0)} variant="neutral" />
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4 text-emerald-700 bg-emerald-50 w-fit px-3 py-1 rounded-md">Customers</h2>
          <DataTable
            columns={userColumns}
            data={customerData?.users || []}
            cardConfig={userCardConfig}
            isLoading={isCustomerFetching}
            onRowClick={(user) => viewDialog.open(user.user_id)}
            pagination={customerPagination}
          />
        </div>

        <div className="pt-6 border-t border-slate-100">
          <h2 className="text-lg font-semibold mb-4 text-blue-700 bg-blue-50 w-fit px-3 py-1 rounded-md">Business Providers</h2>
          <DataTable
            columns={userColumns}
            data={providerData?.users || []}
            cardConfig={userCardConfig}
            isLoading={isProviderFetching}
            onRowClick={(user) => viewDialog.open(user.user_id)}
            pagination={providerPagination}
          />
        </div>
      </div>
    </section>
  );
}
