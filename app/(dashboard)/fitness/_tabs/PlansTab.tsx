"use client";

import React, { useMemo, useState, useCallback } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import DataTable from "@/components/redesign/DataTable";
import { useFitnessPlans, useDeleteFitnessPlan } from "@/hooks/supabase-calls/useFitnessPlan";
import { useAddFitnessPlanDialog, useViewFitnessPlanDialog } from "@/stores/dialog-store";
import AddFitnessPlanDialog from "../_components/add-fitness-plan-dialog";
import ViewFitnessPlanDialog from "../_components/view-fitness-plan-dialog";
import { cn } from "@/lib/utils";
import { Star, Clock, ListChecks, Bot, Sparkles, Search, Filter, Plus } from "lucide-react";

const PlansTab = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;

  const planDialog = useAddFitnessPlanDialog();
  const viewDialog = useViewFitnessPlanDialog();
  const { data, isLoading } = useFitnessPlans({ page, limit, search: debouncedSearch });
  const { mutate: deletePlan } = useDeleteFitnessPlan();

  // Reset page when search changes
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const handleEdit = useCallback(
    (row: any) => {
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

  const columns = [
    {
      key: "title",
      label: "Plan Details",
      render: (val: string, row: any) => (
        <div className="flex flex-col min-w-[200px]">
          <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">{val}</span>
              {row.is_featured && (
                  <span className="badge badge-indigo h-4 text-[9px] uppercase font-black gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-current" /> FEATURED
                  </span>
              )}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
               {row.target_body_parts?.slice(0, 2).map((part: string) => (
                   <span key={part} className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      {part}
                  </span>
               ))}
          </div>
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (val: string) => (
        <span className={cn(
          "badge uppercase tracking-wider text-[10px]",
          val === 'published' ? 'badge-green' : val === 'draft' ? 'bg-slate-100 text-slate-600' : 'badge-amber'
        )}>{val}</span>
      )
    },
    {
      key: "structure",
      label: "Structure",
      render: (_: any, row: any) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {row.duration_weeks} weeks
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
              <ListChecks className="w-3.5 h-3.5 text-slate-400" />
              {row.workouts_per_week} sessions / wk
          </div>
        </div>
      )
    },
    {
      key: "difficulty_level",
      label: "Level",
      render: (val: string) => (
        <span className={cn(
          "badge uppercase tracking-wider text-[10px]",
          val === 'beginner' ? 'badge-blue' : val === 'intermediate' ? 'badge-indigo' : 'badge-purple'
        )}>{val}</span>
      )
    },
    {
      key: "stats",
      label: "Popularity",
      render: (_: any, row: any) => (
        <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-800">{row.total_completions || 0} completions</div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {(row.average_rating || 0).toFixed(1)} ({row.rating_count || 0})
            </div>
        </div>
      )
    }
  ];

  const rowActions = [
    { label: "View", icon: "👁️", onClick: (row: any) => viewDialog.open(row.id) },
    { label: "Edit", icon: "✏️", onClick: handleEdit },
    { label: "Delete", icon: "🗑️", onClick: (row: any) => handleDelete(row.id), danger: true },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 card bg-white">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                 <h3 className="text-2xl font-black text-slate-800">📋 Active Fitness Plans</h3>
                 <p className="text-slate-500 font-medium mt-1">Multi-week structured programs and AI-generated tracks</p>
              </div>
              <div className="flex items-center gap-2">
                 <button className="btn btn-secondary" onClick={() => alert("Open AI Generator")}>
                   <Bot className="h-4 w-4 mr-1 text-blue-500" /> AI Generate
                 </button>
                 <button className="btn btn-primary" onClick={() => planDialog.open()}>
                   <Plus className="h-4 w-4 mr-1" /> Create Plan
                 </button>
              </div>
           </div>
           
           <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  placeholder="Search plans by title or goal..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-ek-green/20 focus:border-ek-green transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button className="btn btn-secondary">
                <Filter className="h-4 w-4 mr-1" /> Difficulty
              </button>
           </div>
        </div>

        <div className="card bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative overflow-hidden">
           <Sparkles className="absolute top-4 right-4 h-12 w-12 text-white/10" />
           <h3 className="text-lg font-black mb-4">🤖 AI Performance</h3>
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
              <button className="w-full btn bg-white text-blue-700 hover:bg-blue-50 font-bold">
                 Review AI Queue
              </button>
           </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.plans || []}
          rowActions={rowActions}
          isLoading={isLoading}
          externalPage={page}
          externalTotalPages={data?.meta?.totalPages || 1}
          onPageChange={setPage}
        />
      </div>

      <AddFitnessPlanDialog />
      <ViewFitnessPlanDialog />
    </div>
  );
};

export default PlansTab;
