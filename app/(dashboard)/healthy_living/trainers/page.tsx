"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Dumbbell, Search, Filter } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";
import { DataTable } from "@/components/Data-Table/data-table";
import { createPaginationHandlers } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useAddTrainerDialog,
  useViewTrainerDialog,
} from "@/stores/dialog-store";
import { createTrainerColumns } from "@/components/Data-Table/columns/trainerColumns";
import { useTrainers, useDeleteTrainer } from "@/hooks/supabase-calls/useTrainer";
import AddTrainerDialog from "../_components/add-trainer-dialog";
import ViewTrainerDialog from "../_components/view-trainer-dialog";
import { TTrainerOutput } from "@/schemas/trainer.schema";

const TrainersPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;

  const trainerDialog = useAddTrainerDialog();
  const viewTrainer = useViewTrainerDialog();
  const { data, isLoading } = useTrainers({ page, limit, search: debouncedSearch });
  const { mutate: deleteTrainer } = useDeleteTrainer();

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
    (row: TTrainerOutput) => {
      trainerDialog.open(row);
    },
    [trainerDialog],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (window.confirm("Are you sure you want to remove this trainer?")) {
        deleteTrainer(id);
      }
    },
    [deleteTrainer],
  );

  const columns = useMemo(
    () => createTrainerColumns({ onEdit: handleEdit, onDelete: handleDelete }),
    [handleEdit, handleDelete],
  );

  return (
    <section className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px] bg-white shadow-sm mt-2 rounded-lg">
      <SectionHeader
        title="Fitness Trainers"
        Icon={Dumbbell}
        description="Manage professional fitness trainers and their availability"
        hasButton
        buttonLabel="+ Onboard Trainer"
        onButtonClick={() => trainerDialog.open()}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6 px-4 lg:px-0 mt-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search trainers by name..."
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
          data={data?.trainers || []}
          pagination={pagination}
          isLoading={isLoading}
          onRowClick={(row) => viewTrainer.open(row.id)}
        />
      </div>

      <AddTrainerDialog />
      <ViewTrainerDialog />
    </section>
  );
};

export default TrainersPage;
