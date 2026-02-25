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
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const limit = 10;

  const { data, isLoading, isFetching, error } = useUsers({
    page,
    limit,
    search: debouncedSearch,
    admin: false,
  });

  const paginationHandlers = useMemo(
    () => createPaginationHandlers(page, setPage, data?.meta.totalPages),
    [page, data?.meta.totalPages]
  );

  const pagination = useMemo(
    () => ({
      currentPage: page,
      totalPages: data?.meta.totalPages || 1,
      totalItems: data?.meta.total || 0,
      pageSize: limit,
      onPageChange: paginationHandlers.goTo,
      onNextPage: paginationHandlers.next,
      onPreviousPage: paginationHandlers.previous,
      canNextPage: page < (data?.meta.totalPages || 1),
      canPreviousPage: page > 1,
    }),
    [page, data, paginationHandlers]
  );

  if (isLoading) return <TableSkeleton />;
  if (error) return <ErrorState error={error.message} onRetry={() => setPage(1)} />;

  return (
    <section>
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
              setPage(1);
            }}
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard label="Total App Users" value={data?.meta.total || 0} />
        <StatsCard label="Active" value={data?.analytics?.active || 0} variant="success" />
        <StatsCard label="Pending" value={data?.analytics?.pending || 0} variant="warning" />
        <StatsCard label="Inactive" value={data?.analytics?.inactive || 0} variant="neutral" />
      </div>

      <DataTable
        columns={userColumns}
        data={data?.users || []}
        cardConfig={userCardConfig}
        isLoading={isFetching}
        onRowClick={(user) => viewDialog.open(user.user_id)}
        pagination={pagination}
      />
    </section>
  );
}
