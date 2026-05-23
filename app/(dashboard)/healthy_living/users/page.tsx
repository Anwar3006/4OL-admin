"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Users, Search, Filter, UserPlus } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";
import { DataTable } from "@/components/Data-Table/data-table";
import { createPaginationHandlers } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUsers } from "@/hooks/supabase-calls/useUser";
import { fitnessUserColumns } from "@/components/Data-Table/columns/fitnessUserColumns";

const FitnessUsersPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;

  const { data, isLoading } = useUsers({
    page,
    limit,
    search: debouncedSearch,
    admin: false, // Regular users
    userType: 'user',
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const paginationHandlers = useMemo(
    () => createPaginationHandlers(page, setPage, data?.meta?.totalPages ?? 1),
    [page, data?.meta?.totalPages],
  );

  const pagination = useMemo(
    () => ({
      currentPage: page,
      totalPages: data?.meta?.totalPages || 1,
      totalItems: data?.meta?.total || 0,
      pageSize: limit,
      onPageChange: paginationHandlers.goTo,
      onNextPage: paginationHandlers.next,
      onPreviousPage: paginationHandlers.previous,
      canNextPage: page < (data?.meta?.totalPages || 1),
      canPreviousPage: page > 1,
    }),
    [page, data, paginationHandlers],
  );

  return (
    <section className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px] bg-white shadow-sm mt-2 rounded-lg">
      <SectionHeader
        title="Fitness Participants"
        Icon={Users}
        description="Monitor user engagement, progress and platform activity"
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6 px-4 lg:px-0 mt-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search participants by name or email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
        <Button className="rounded-xl bg-[#131927] hover:bg-[#1e2d42] font-bold gap-2">
            <UserPlus className="h-4 w-4" /> Add User
        </Button>
      </div>

      <div className="mt-4 px-4 lg:px-0">
        <DataTable
          columns={fitnessUserColumns}
          data={data?.users || []}
          pagination={pagination}
          isLoading={isLoading}
          onRowClick={() => {}}
        />
      </div>
    </section>
  );
};

export default FitnessUsersPage;
