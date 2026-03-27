"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Activity, Search } from "lucide-react";
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
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const limit = 10;

  const workoutDialog = useAddWorkoutDialog();
  const { data, isLoading } = useWorkouts({ page, limit, search });
  const { mutate: deleteWorkout } = useDeleteWorkout();

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

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

      {/* Search */}
      <div className="px-4 lg:px-0 mt-4 flex items-center gap-2 max-w-md">
        <Input
          placeholder="Search by exercise name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-9"
        />
        <Button size="sm" onClick={handleSearch} className="gap-1.5 shrink-0">
          <Search className="h-4 w-4" />
          Search
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
