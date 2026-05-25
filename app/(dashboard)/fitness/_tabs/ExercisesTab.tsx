"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Search, Filter, Plus, Download, MoreVertical, Eye, Edit2, Trash2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { DataTable } from "@/components/Data-Table/data-table";
import { createExerciseColumns } from "@/components/Data-Table/columns/exerciseColumns";
import { createPaginationHandlers } from "@/lib/utils";
import { useExercises, useDeleteExercise } from "@/hooks/supabase-calls/useExercise";
import { useAddExerciseDialog } from "@/stores/dialog-store";
import AddExerciseDialog from "../_components/add-exercise-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TExerciseOutput } from "@/schemas/exercise.schema";
import { Progress } from "@/components/ui/progress";

const ExercisesTab = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;

  const exerciseDialog = useAddExerciseDialog();
  const { data, isLoading } = useExercises({ page, limit, search: debouncedSearch });
  const { mutate: deleteExercise } = useDeleteExercise();

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
    (row: TExerciseOutput) => {
      exerciseDialog.open(row);
    },
    [exerciseDialog],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (window.confirm("Are you sure you want to delete this exercise?")) {
        deleteExercise(id);
      }
    },
    [deleteExercise],
  );

  const columns = useMemo(
    () => createExerciseColumns({ onEdit: handleEdit, onDelete: handleDelete }),
    [handleEdit, handleDelete],
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Exercises Header & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none shadow-sm rounded-[2rem] bg-white">
          <CardHeader className="p-8 pb-4">
             <div className="flex items-center justify-between">
                <div>
                   <CardTitle className="text-2xl font-black">🏋️ Exercise Library</CardTitle>
                   <p className="text-slate-500 font-medium mt-1">Manage physical activities and instructional content</p>
                </div>
                <Button className="rounded-xl font-bold bg-[#2cc295] hover:bg-[#25a37d]" onClick={() => exerciseDialog.open()}>
                  <Plus className="h-4 w-4 mr-2" /> Add New
                </Button>
             </div>
          </CardHeader>
          <CardContent className="p-8 pt-0">
             <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by exercise name or muscle..."
                    className="pl-9 h-12 rounded-2xl border-slate-100 bg-slate-50 focus-visible:ring-emerald-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button variant="outline" className="h-12 rounded-2xl font-bold border-slate-200">
                  <Filter className="h-4 w-4 mr-2" /> Filters
                </Button>
             </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-[2rem] bg-slate-900 text-white p-8">
           <CardTitle className="text-lg font-black mb-6">📊 Exercise Analytics</CardTitle>
           <div className="space-y-6">
              {[
                { label: "Total Exercises", val: data?.meta?.total || 0, max: 2000, color: "bg-blue-400" },
                { label: "Strength vs Cardio", val: 65, max: 100, color: "bg-emerald-400" },
                { label: "Beginner Friendly", val: 42, max: 100, color: "bg-amber-400" },
              ].map((stat, i) => (
                <div key={i} className="space-y-2">
                   <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>{stat.label}</span>
                      <span>{stat.val}</span>
                   </div>
                   <Progress value={(stat.val / stat.max) * 100} className="h-1 bg-slate-800" />
                </div>
              ))}
           </div>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border-none shadow-sm rounded-[2rem] bg-white overflow-hidden">
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={data?.exercises || []}
            pagination={pagination}
            isLoading={isLoading}
            onRowClick={() => {}}
          />
        </CardContent>
      </Card>

      <AddExerciseDialog />
    </div>
  );
};

export default ExercisesTab;
