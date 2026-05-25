"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import { UserSquare, Search, Filter, Plus, ShieldCheck, Star } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { DataTable } from "@/components/Data-Table/data-table";
import { createPaginationHandlers } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  useAddTrainerDialog,
  useViewTrainerDialog,
} from "@/stores/dialog-store";
import { createTrainerColumns } from "@/components/Data-Table/columns/trainerColumns";
import { useTrainers, useDeleteTrainer } from "@/hooks/supabase-calls/useTrainer";
import AddTrainerDialog from "../_components/add-trainer-dialog";
import ViewTrainerDialog from "../_components/view-trainer-dialog";
import { TTrainerOutput } from "@/schemas/trainer.schema";

const TrainersTab = () => {
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 border-none shadow-sm rounded-[2rem] bg-white">
          <CardHeader className="p-8 pb-4">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                   <CardTitle className="text-2xl font-black">👨‍🏫 Trainer Directory</CardTitle>
                   <p className="text-slate-500 font-medium mt-1">Manage certified fitness professionals and availability</p>
                </div>
                <Button className="rounded-xl font-bold bg-[#2cc295] hover:bg-[#25a37d]" onClick={() => trainerDialog.open()}>
                  <Plus className="h-4 w-4 mr-2" /> Add Trainer
                </Button>
             </div>
          </CardHeader>
          <CardContent className="p-8 pt-0">
             <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by trainer name or specialty..."
                    className="pl-9 h-12 rounded-2xl border-slate-100 bg-slate-50 focus-visible:ring-emerald-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button variant="outline" className="h-12 rounded-2xl font-bold border-slate-200">
                  <Filter className="h-4 w-4 mr-2" /> Verification
                </Button>
             </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-[2rem] bg-slate-900 text-white p-8">
           <CardTitle className="text-lg font-black mb-6">📊 Trainer Stats</CardTitle>
           <div className="space-y-6">
              {[
                { label: "Total Trainers", val: 48, icon: UserSquare },
                { label: "Verified Status", val: "75%", icon: ShieldCheck },
                { label: "Avg Rating", val: "4.8", icon: Star },
              ].map((stat, i) => (
                <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                         <stat.icon className="h-4 w-4 text-emerald-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-400">{stat.label}</span>
                   </div>
                   <span className="text-lg font-black">{stat.val}</span>
                </div>
              ))}
           </div>
        </Card>
      </div>

      <Card className="border-none shadow-sm rounded-[2rem] bg-white overflow-hidden">
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={data?.trainers || []}
            pagination={pagination}
            isLoading={isLoading}
            onRowClick={(row) => viewTrainer.open(row.id)}
          />
        </CardContent>
      </Card>

      <AddTrainerDialog />
      <ViewTrainerDialog />
    </div>
  );
};

export default TrainersTab;
