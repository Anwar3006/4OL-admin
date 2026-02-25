"use client";
import { DataTable } from "@/components/Data-Table/data-table";
import SectionHeader from "@/components/SectionHeader";
import { createPaginationHandlers } from "@/lib/utils";
import {
  useAddConditionDialog,
  useViewConditionDialog,
} from "@/stores/dialog-store";
import { PlusCircleIcon } from "lucide-react";
import React, { useState, useCallback, useMemo } from "react";
import AddConditionDialog from "./_components/add-condition-dialog";
import { conditionColumns } from "@/components/Data-Table/columns/conditionColumns";
import { conditionCardConfig } from "@/components/Data-Table/mobile-table-configs/conditionCardConfig";
import { ViewConditionDialog } from "./_components/view-condition-dialog";
import ConditionsStats from "./_components/ConditionStats";
import {
  useConditions,
  useConditionStats,
} from "@/hooks/supabase-calls/useCondition";

const DiseasesAndConditionsPage = () => {
  const addConditions = useAddConditionDialog();
  const viewConditions = useViewConditionDialog();
  const [page, setPage] = useState(1);
  const limit = 10;

  // Paginated table data
  const { data: allConditions, isLoading: isConditionsLoading } = useConditions({
    params: { limit, page, search: "" },
    enabled: true,
  });

  // Stats for analytics cards
  const { data: stats, isLoading: isStatsLoading } = useConditionStats(true);

  const conditionsPagination = useMemo(
    () => createPaginationHandlers(page, setPage, allConditions?.meta?.totalPages),
    [page, allConditions?.meta?.totalPages],
  );

  const onRowClick = useCallback(
    (condition) => viewConditions.open(condition.id),
    [viewConditions],
  );

  const pagination = useMemo(
    () => ({
      currentPage: page,
      totalPages: allConditions?.meta?.totalPages || 1,
      totalItems: allConditions?.meta?.total || 0,
      pageSize: limit,
      onPageChange: conditionsPagination.goTo,
      onNextPage: conditionsPagination.next,
      onPreviousPage: conditionsPagination.previous,
      canNextPage: page < (allConditions?.meta?.totalPages || 1),
      canPreviousPage: page > 1,
    }),
    [page, allConditions, conditionsPagination],
  );

  return (
    <section className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px]">
      <SectionHeader
        title="Diseases & Conditions"
        Icon={PlusCircleIcon}
        description="Manage the diseases and conditions"
        hasButton
        buttonLabel="Add Condition"
        onButtonClick={() => addConditions.open()}
      />

      {/* Analytics Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 items-start">
        <ConditionsStats
          label="Total Registered"
          value={allConditions?.meta?.total || 0}
          isLoading={isConditionsLoading}
        />
        <ConditionsStats
          label="Total Categories"
          value={stats?.totalCategories || 0}
          isLoading={isStatsLoading}
        />
        <ConditionsStats
          label="Most Affected Body Part"
          value={stats?.mostAffectedBodyPart || "N/A"}
          isLoading={isStatsLoading}
        />
        <ConditionsStats
          label="Most Recurring Category"
          value={stats?.mostRecurringCategory || "N/A"}
          isLoading={isStatsLoading}
        />
      </div>

      {/* Data Table */}
      <DataTable
        columns={conditionColumns}
        data={allConditions?.conditions || []}
        cardConfig={conditionCardConfig}
        onRowClick={onRowClick}
        pagination={pagination}
        isLoading={isConditionsLoading}
      />

      {/* Dialogs */}
      <AddConditionDialog />
      <ViewConditionDialog />
    </section>
  );
};

export default DiseasesAndConditionsPage;
