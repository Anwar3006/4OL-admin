"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Search, Filter, Plus, Bot, Sparkles } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { DataTable } from "@/components/Data-Table/data-table";
import { createFitnessPlanColumns } from "@/components/Data-Table/columns/fitnessPlanColumns";
import { createPaginationHandlers } from "@/lib/utils";
import { useFitnessPlans, useDeleteFitnessPlan } from "@/hooks/supabase-calls/useFitnessPlan";
import { useAddFitnessPlanDialog } from "@/stores/dialog-store";
import AddFitnessPlanDialog from "../_components/add-fitness-plan-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TFitnessPlanOutput } from "@/schemas/fitness-plan.schema";

const PlansTab = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;

  const planDialog = useAddFitnessPlanDialog();
  const { data, isLoading } = useFitnessPlans({ page, limit, search: debouncedSearch });
  const { mutate: deletePlan } = useDeleteFitnessPlan();

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
    (row: TFitnessPlanOutput) => {
      planDialog.open(row);
    },
    [planDialog],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (window.confirm("Are you sure you want to delete this fitness plan?")) {
        deletePlan(id);
      }
    },
    [deletePlan],
  );

  const columns = useMemo(
    () => createFitnessPlanColumns({ onEdit: handleEdit, onDelete: handleDelete }),
    [handleEdit, handleDelete],
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Plans Header & AI CTA */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <Card className="xl:col-span-3 border-none shadow-sm rounded-[2rem] bg-white">
          <CardHeader className="p-8 pb-4">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                   <CardTitle className="text-2xl font-black">📋 Active Fitness Plans</CardTitle>
                   <p className="text-slate-500 font-medium mt-1">Multi-week structured programs and AI-generated tracks</p>
                </div>
                <div className="flex items-center gap-2">
                   <Button variant="outline" className="rounded-xl font-bold border-slate-200" onClick={() => alert("Open AI Generator")}>
                     <Bot className="h-4 w-4 mr-2 text-blue-500" /> AI Generate
                   </Button>
                   <Button className="rounded-xl font-bold bg-[#2cc295] hover:bg-[#25a37d]" onClick={() => planDialog.open()}>
                     <Plus className="h-4 w-4 mr-2" /> Create Plan
                   </Button>
                </div>
             </div>
          </CardHeader>
          <CardContent className="p-8 pt-0">
             <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search plans by title or goal..."
                    className="pl-9 h-12 rounded-2xl border-slate-100 bg-slate-50 focus-visible:ring-emerald-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button variant="outline" className="h-12 rounded-2xl font-bold border-slate-200">
                  <Filter className="h-4 w-4 mr-2" /> Difficulty
                </Button>
             </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-8 relative overflow-hidden">
           <Sparkles className="absolute top-4 right-4 h-12 w-12 text-white/10" />
           <CardTitle className="text-lg font-black mb-4">🤖 AI Performance</CardTitle>
           <div className="space-y-4">
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">AI Plans Active</p>
                 <h3 className="text-3xl font-black">340</h3>
              </div>
              <div className="pt-4 border-t border-white/10">
                 <p className="text-xs font-medium text-blue-100 leading-relaxed">
                    AI-generated plans have an 18% higher completion rate this month.
                 </p>
              </div>
              <Button variant="secondary" className="w-full rounded-xl font-bold bg-white text-blue-700 hover:bg-blue-50">
                 Review AI Queue
              </Button>
           </div>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border-none shadow-sm rounded-[2rem] bg-white overflow-hidden">
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={data?.plans || []}
            pagination={pagination}
            isLoading={isLoading}
            onRowClick={() => {}}
          />
        </CardContent>
      </Card>

      <AddFitnessPlanDialog />
    </div>
  );
};

export default PlansTab;
