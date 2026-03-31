"use client";
import SectionHeader from "@/components/SectionHeader";
import { Trophy, Search, Filter } from "lucide-react";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import ConditionsStats from "@/components/dashboard/ConditionStats";
import { DataTable } from "@/components/Data-Table/data-table";
import { createPaginationHandlers } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useAddChallengeDialog,
  useViewChallengeDialog,
} from "@/stores/dialog-store";
import { challengeColumns } from "@/components/Data-Table/columns/challengeColumns";
import { useChallenges } from "@/hooks/supabase-calls/useChallenge";
import AddChallengeDialog from "../_components/add-challenge-dialog";
import ViewChallengeDialog from "../_components/view-challenge-dialog";

const ChallengesPage = () => {
  const addChallenge = useAddChallengeDialog();
  const viewChallenge = useViewChallengeDialog();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;
  const { data, isLoading } = useChallenges({
    page,
    limit,
    search: debouncedSearch,
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const paginationHandler = useMemo(
    () => createPaginationHandlers(page, setPage, data?.meta.totalPages),
    [page, data?.meta.totalPages],
  );

  const onRowClick = useCallback(
    (data: any) => viewChallenge.open(data.id),
    [viewChallenge],
  );

  const pagination = useMemo(
    () => ({
      currentPage: page,
      totalPages: data?.meta?.totalPages || 1,
      totalItems: data?.meta?.total || 0,
      pageSize: 10,
      onPageChange: paginationHandler.goTo,
      onNextPage: paginationHandler.next,
      onPreviousPage: paginationHandler.previous,
      canNextPage: page < (data?.meta?.totalPages || 1),
      canPreviousPage: page > 1,
    }),
    [page, data, paginationHandler],
  );

  return (
    <section className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px] bg-white shadow-sm mt-2 rounded-lg">
      <SectionHeader
        title="Challenges"
        Icon={Trophy}
        description="Manage healthy living challenges"
        hasButton
        buttonLabel="Create Challenge"
        onButtonClick={() => addChallenge.open()}
      />
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search challenges..."
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
      <div className="grid grid-cols-2 gap-4 mb-6">
        <ConditionsStats
          label="Total Challenges"
          value={data?.meta?.total || 0}
          isLoading={isLoading}
        />
      </div>
      <DataTable
        columns={challengeColumns}
        data={data?.challenges || []}
        onRowClick={onRowClick}
        pagination={pagination}
        isLoading={isLoading}
      />
      <AddChallengeDialog />
      <ViewChallengeDialog />
    </section>
  );
};
export default ChallengesPage;
