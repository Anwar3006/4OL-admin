"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Activity, Search, Filter } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import SectionHeader from "@/components/SectionHeader";
import { DataTable } from "@/components/Data-Table/data-table";
import { createWorkoutColumns } from "@/components/Data-Table/columns/workoutColumns";
import { createPaginationHandlers } from "@/lib/utils";
import { useWorkouts, useDeleteWorkout } from "@/hooks/supabase-calls/useWorkout";
import { useAddWorkoutDialog } from "@/stores/dialog-store";
import AddWorkoutDialog from "../_components/add-workout-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TWorkoutOutput } from "@/schemas/workout.schema";

const WorkoutsPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;

  const workoutDialog = useAddWorkoutDialog();
  const { data, isLoading } = useWorkouts({ page, limit, search: debouncedSearch });
  const { mutate: deleteWorkout } = useDeleteWorkout();

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
    (row: TWorkoutOutput) => {
      workoutDialog.open(row);
    },
    [workoutDialog],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (
        window.confirm("Are you sure you want to delete this workout?")
      ) {
        deleteWorkout(id);
      }
    },
    [deleteWorkout],
  );

  const columns = useMemo(
    () => createWorkoutColumns({ onEdit: handleEdit, onDelete: handleDelete }),
    [handleEdit, handleDelete],
  );

  return (
    <section className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px] bg-white shadow-sm mt-2 rounded-lg">
      <SectionHeader
        title="Workouts"
        Icon={Activity}
        description="Manage healthy living workouts"
        hasButton
        buttonLabel="+ Add New"
        onButtonClick={() => workoutDialog.open()}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6 px-4 lg:px-0 mt-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by exercise name..."
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
          data={data?.workouts || []}
          pagination={pagination}
          isLoading={isLoading}
          onRowClick={() => {}}
        />
      </div>

      <AddWorkoutDialog />
    </section>
  );
};

export default WorkoutsPage;
