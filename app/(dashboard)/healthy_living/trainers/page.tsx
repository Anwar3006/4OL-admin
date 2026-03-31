"use client";
import SectionHeader from "@/components/SectionHeader";
import { Dumbbell, PlusCircleIcon, Search, Filter } from "lucide-react";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ConditionsStats from "@/components/dashboard/ConditionStats";
import { DataTable } from "@/components/Data-Table/data-table";
import { createPaginationHandlers } from "@/lib/utils";
import {
  useAddTrainerDialog,
  useViewTrainerDialog,
} from "@/stores/dialog-store";
import { trainerColumns } from "@/components/Data-Table/columns/trainerColumns";
import { useTrainers } from "@/hooks/supabase-calls/useTrainer";
import AddTrainerDialog from "../_components/add-trainer-dialog";
import ViewTrainerDialog from "../_components/view-trainer-dialog";

const TrainersPage = () => {
  const addTrainer = useAddTrainerDialog();
  const viewTrainer = useViewTrainerDialog();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading } = useTrainers({
    page,
    limit,
    search: debouncedSearch,
  });

  const paginationHandler = useMemo(
    () => createPaginationHandlers(page, setPage, data?.meta.totalPages),
    [page, data?.meta.totalPages],
  );

  const onRowClick = useCallback(
    (data: any) => viewTrainer.open(data.id),
    [viewTrainer],
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
        title="Trainers"
        Icon={Dumbbell}
        description="Manage healthy living trainers"
        hasButton
        buttonLabel="Add Trainer"
        onButtonClick={() => addTrainer.open()}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search trainers..."
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
          label="Total Trainers"
          value={data?.meta?.total || 0}
          isLoading={isLoading}
        />
      </div>
      <DataTable
        columns={trainerColumns}
        data={data?.trainers || []}
        onRowClick={onRowClick}
        pagination={pagination}
        isLoading={isLoading}
      />
      <AddTrainerDialog />
      <ViewTrainerDialog />
    </section>
  );
};
export default TrainersPage;
