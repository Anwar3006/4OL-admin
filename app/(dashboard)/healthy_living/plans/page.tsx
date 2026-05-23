"use client";

import React, { useMemo, useState, useCallback } from "react";
import { ClipboardList, Search, Filter } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import SectionHeader from "@/components/SectionHeader";
import { DataTable } from "@/components/Data-Table/data-table";
import { createWorkoutPlanColumns } from "@/components/Data-Table/columns/workoutPlanColumns";
import { createPaginationHandlers } from "@/lib/utils";
import { useWorkoutPlans, useDeleteWorkoutPlan } from "@/hooks/supabase-calls/useWorkoutPlan";
import { useAddWorkoutPlanDialog } from "@/stores/dialog-store";
import AddWorkoutPlanDialog from "../_components/add-workout-plan-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TWorkoutPlanOutput } from "@/schemas/workout-plan.schema";

const PlansPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;

  const planDialog = useAddWorkoutPlanDialog();
  const { data, isLoading } = useWorkoutPlans({ page, limit, search: debouncedSearch });
  const { mutate: deletePlan } = useDeleteWorkoutPlan();

  // Reset page when search changes
  React.useEffect(() => {
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
    (row: TWorkoutPlanOutput) => {
      planDialog.open(row);
    },
    [planDialog],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (
        window.confirm("Are you sure you want to delete this plan?")
      ) {
        deletePlan(id);
      }
    },
    [deletePlan],
  );

  const columns = useMemo(
    () => createWorkoutPlanColumns({ onEdit: handleEdit, onDelete: handleDelete }),
    [handleEdit, handleDelete],
  );

  return (
    <section className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px] bg-white shadow-sm mt-2 rounded-lg">
      <SectionHeader
        title="Workout Plans"
        Icon={ClipboardList}
        description="Manage healthy living structured plans"
        hasButton
        buttonLabel="+ Create Plan"
        onButtonClick={() => planDialog.open()}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6 px-4 lg:px-0 mt-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search plans by title..."
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
          data={data?.plans || []}
          pagination={pagination}
          isLoading={isLoading}
          onRowClick={() => {}}
        />
      </div>

      <AddWorkoutPlanDialog />
    </section>
  );
};

export default PlansPage;
