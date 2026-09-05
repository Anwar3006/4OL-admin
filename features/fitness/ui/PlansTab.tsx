"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { DataTable } from "@/components/Data-Table/data-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useFitnessPlans,
  useDeleteFitnessPlan,
} from "@/features/fitness/data/useFitnessPlan";
import {
  useAddFitnessPlanDialog,
  useViewFitnessPlanDialog,
  useAiGeneratePlanDialog,
} from "@/stores/dialog-store";
import AddFitnessPlanDialog from "./add-fitness-plan-dialog";
import AiGeneratePlanDialog from "./ai-generate-plan-dialog";

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
import { ViewFitnessPlanDialog } from "./view-fitness-plan-dialog";

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
  const { data, isLoading, isError, error } = useFitnessPlans({
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

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = useCallback(
    (id: string) => {
      setDeleteId(id);
    },
    [],
  );

  const confirmDelete = useCallback(() => {
    if (deleteId) {
      deletePlan(deleteId);
      setDeleteId(null);
    }
  }, [deleteId, deletePlan]);

  const columns = useMemo(
    () => [
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
      // Part V: mockup asks for Profile Hash + AI Cost. The schema stores
      // selection_hash (profile hash) and author_type ('ai' marks AI-created
      // plans); per-plan AI cost is not modeled, so cost lives in the AI Log
      // tab's budget card instead.
      accessorKey: "author_type",
      header: "Origin",
      cell: ({ row }: any) => (
        <span
          className={cn(
            "badge uppercase tracking-wider text-[10px]",
            row.original.author_type === "ai"
              ? "badge-purple"
              : row.original.author_type === "admin"
                ? "badge-blue"
                : "bg-slate-100 text-slate-600",
          )}
        >
          {row.original.author_type === "ai"
            ? "🤖 AI"
            : row.original.author_type || "trainer"}
        </span>
      ),
    },
    {
      accessorKey: "selection_hash",
      header: "Profile Hash",
      cell: ({ row }: any) => (
        <span
          className="text-[10px] font-mono text-slate-500"
          title={row.original.selection_hash ?? undefined}
        >
          {row.original.selection_hash
            ? `#${row.original.selection_hash.slice(0, 8)}`
            : "—"}
        </span>
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
    ],
    [handleDelete, handleEdit, viewDialog],
  );

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
          isError={isError}
          error={error}
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

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this fitness plan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PlansTab;
