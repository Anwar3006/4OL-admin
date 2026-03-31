"use client";
import { DataTable } from "@/components/Data-Table/data-table";
import SectionHeader from "@/components/SectionHeader";
import { createPaginationHandlers } from "@/lib/utils";
import {
  useAddConditionDialog,
  useViewConditionDialog,
} from "@/stores/dialog-store";
import { PlusCircleIcon, Search, Filter } from "lucide-react";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Paginated table data
  const { data: allConditions, isLoading: isConditionsLoading } = useConditions(
    {
      params: { limit, page, search: debouncedSearch },
      enabled: true,
    },
  );

  // Stats for analytics cards
  const { data: stats, isLoading: isStatsLoading } = useConditionStats(true);

  const conditionsPagination = useMemo(
    () =>
      createPaginationHandlers(page, setPage, allConditions?.meta?.totalPages),
    [page, allConditions?.meta?.totalPages],
  );

  const onRowClick = useCallback(
    (condition) => viewConditions.open(condition.id),
    [viewConditions],
  );

  console.log("Stats: ", stats);
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
    <section className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px] bg-white shadow-sm mt-2 rounded-lg">
      <SectionHeader
        title="Diseases & Conditions"
        Icon={PlusCircleIcon}
        // description="Manage the diseases and conditions"
        hasButton
        buttonLabel="Add Condition"
        onButtonClick={() => addConditions.open()}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search conditions..."
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
