"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Trophy, Search, Filter } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";
import { DataTable } from "@/components/Data-Table/data-table";
import { createPaginationHandlers } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useAddChallengeDialog,
  useViewChallengeDialog,
} from "@/stores/dialog-store";
import { createChallengeColumns } from "@/components/Data-Table/columns/challengeColumns";
import { useChallenges, useDeleteChallenge } from "@/hooks/supabase-calls/useChallenge";
import AddChallengeDialog from "../_components/add-challenge-dialog";
import ViewChallengeDialog from "../_components/view-challenge-dialog";
import { TChallengeOutput } from "@/schemas/challenge.schema";

const ChallengesPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;

  const challengeDialog = useAddChallengeDialog();
  const viewChallenge = useViewChallengeDialog();
  const { data, isLoading } = useChallenges({ page, limit, search: debouncedSearch });
  const { mutate: deleteChallenge } = useDeleteChallenge();

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

  const handleEdit = useCallback(
    (row: TChallengeOutput) => {
      challengeDialog.open(row);
    },
    [challengeDialog],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (window.confirm("Are you sure you want to cancel and delete this challenge?")) {
        deleteChallenge(id);
      }
    },
    [deleteChallenge],
  );

  const columns = useMemo(
    () => createChallengeColumns({ onEdit: handleEdit, onDelete: handleDelete }),
    [handleEdit, handleDelete],
  );

  return (
    <section className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px] bg-white shadow-sm mt-2 rounded-lg">
      <SectionHeader
        title="Fitness Challenges"
        Icon={Trophy}
        description="Manage community-wide fitness challenges and rewards"
        hasButton
        buttonLabel="+ Launch Challenge"
        onButtonClick={() => challengeDialog.open()}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6 px-4 lg:px-0 mt-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by challenge title..."
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

      <div className="mt-4 px-4 lg:px-0">
        <DataTable
          columns={columns}
          data={data?.challenges || []}
          pagination={pagination}
          isLoading={isLoading}
          onRowClick={(row) => viewChallenge.open(row.id)}
        />
      </div>

      <AddChallengeDialog />
      <ViewChallengeDialog />
    </section>
  );
};

export default ChallengesPage;
