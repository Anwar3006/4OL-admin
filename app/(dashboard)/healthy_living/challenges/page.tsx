"use client";
import SectionHeader from "@/components/SectionHeader";
import { Trophy } from "lucide-react";
import React, { useState, useCallback, useMemo } from "react";
import ConditionsStats from "@/components/dashboard/ConditionStats";
import { DataTable } from "@/components/Data-Table/data-table";
import { createPaginationHandlers } from "@/lib/utils";
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
  const limit = 10;
  const { data, isLoading } = useChallenges({ page, limit });

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
