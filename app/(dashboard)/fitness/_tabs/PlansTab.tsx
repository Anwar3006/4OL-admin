"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { DataTable } from "@/components/Data-Table/data-table";
import {
  useFitnessPlans,
  useDeleteFitnessPlan,
} from "@/hooks/supabase-calls/useFitnessPlan";
import {
  useAddFitnessPlanDialog,
  useViewFitnessPlanDialog,
  useAiGeneratePlanDialog,
} from "@/stores/dialog-store";
import AddFitnessPlanDialog from "../_components/add-fitness-plan-dialog";
import AiGeneratePlanDialog from "../_components/ai-generate-plan-dialog";

import { cn } from "@/lib/utils";
import {
  Star,
  Clock,
  ListChecks,
  Bot,
  Sparkles,
  Search,
  Filter,
  Plus,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { ViewFitnessPlanDialog } from "../_components/view-fitness-plan-dialog";

const PlansTab = () => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;
  const searchParams = useSearchParams();

  // Read page from URL to trigger refetch when pagination changes
  const page = parseInt(searchParams.get("fit_plan_page") || "1", 10);

  const planDialog = useAddFitnessPlanDialog();
  const viewDialog = useViewFitnessPlanDialog();
  const aiGenerateDialog = useAiGeneratePlanDialog();
  const { data, isLoading } = useFitnessPlans({
    page,
    limit,
    search: debouncedSearch,
  });
  const { mutate: deletePlan } = useDeleteFitnessPlan();

  const handleEdit = useCallback(
    (row: any) => {
      planDialog.open(row);
    },
    [planDialog],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (
        window.confirm("Are you sure you want to delete this fitness plan?")
      ) {
        deletePlan(id);
      }
    },
    [deletePlan],
  );

  const columns = [
    {
      accessorKey: "title",
      header: "Plan Details",
      cell: ({ row }: any) => (
        <div className="flex flex-col min-w-[200px]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">
              {row.original.title}
            </span>
            {row.original.is_featured && (
              <span className="badge badge-indigo h-4 text-[9px] uppercase font-black gap-0.5">
                <Star className="w-2.5 h-2.5 fill-current" /> FEATURED
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {row.original.target_body_parts?.slice(0, 2).map((part: string) => (
              <span
                key={part}
                className="text-[10px] text-slate-400 uppercase font-bold tracking-wider"
              >
                {part}
              </span>
            ))}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => (
        <span
          className={cn(
            "badge uppercase tracking-wider text-[10px]",
            row.original.status === "published"
              ? "badge-green"
              : row.original.status === "draft"
                ? "bg-slate-100 text-slate-600"
                : "badge-amber",
          )}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: "structure",
      header: "Structure",
      cell: ({ row }: any) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {row.original.duration_weeks} weeks
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
            <ListChecks className="w-3.5 h-3.5 text-slate-400" />
            {row.original.workouts_per_week} sessions / wk
          </div>
        </div>
      ),
    },
    {
      accessorKey: "difficulty_level",
      header: "Level",
      cell: ({ row }: any) => (
        <span
          className={cn(
            "badge uppercase tracking-wider text-[10px]",
            row.original.difficulty_level === "beginner"
              ? "badge-blue"
              : row.original.difficulty_level === "intermediate"
                ? "badge-indigo"
                : "badge-purple",
          )}
        >
          {row.original.difficulty_level}
        </span>
      ),
    },
    {
      accessorKey: "stats",
      header: "Popularity",
      cell: ({ row }: any) => (
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-slate-800">
            {row.original.total_completions || 0} completions
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {(row.original.average_rating || 0).toFixed(1)} (
            {row.original.rating_count || 0})
          </div>
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }: any) => {
        const plan = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <button
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                viewDialog.open(plan.id);
              }}
            >
              👁️
            </button>
            <button
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(plan);
              }}
            >
              ✏️
            </button>
            <button
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(plan.id);
              }}
            >
              🗑️
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 gap-6">
        <div className="xl:col-span-3 card bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-2xl font-black text-slate-800">
                📋 Active Fitness Plans
              </h3>
              <p className="text-slate-500 font-medium mt-1">
                Multi-week structured programs and AI-generated tracks
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-secondary"
                onClick={() => aiGenerateDialog.open()}
              >
                <Bot className="h-4 w-4 mr-1 text-blue-500" /> AI Generate
              </button>
              <button
                className="btn btn-primary"
                onClick={() => planDialog.open()}
              >
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
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.plans || []}
          isLoading={isLoading}
          pagination={true}
          urlPersistence={{
            pageKey: "fit_plan_page",
            pageSizeKey: "fit_plan_pageSize",
          }}
          totalItems={data?.meta?.total || 0}
        />
      </div>

      <AddFitnessPlanDialog />
      <AiGeneratePlanDialog />
      <ViewFitnessPlanDialog />
    </div>
  );
};

export default PlansTab;
