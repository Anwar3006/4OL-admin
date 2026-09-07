"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAddExerciseDialog, useViewExerciseDialog } from "@/features/fitness/data/dialog-hooks";
import { useDeleteExercise } from "@/features/fitness/data/useExercise";
import { Badge } from "@/components/ui/badge";

export const exerciseColumns: ColumnDef<any>[] = [
  {
    accessorKey: "exercise_name",
    header: "Exercise Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 text-sm">
          🏋️
        </div>
        <div>
          <div className="font-black text-slate-800 text-xs uppercase tracking-tight leading-none mb-1">
            {row.original.exercise_name}
          </div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <Badge variant="blue" className="text-3xs">
        {row.original.category}
      </Badge>
    ),
  },
  {
    accessorKey: "muscle_groups",
    header: "Muscle Groups",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        <span className="text-2xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {row.original.primary_muscle_group}
        </span>
        {row.original.secondary_muscles && (
          <span className="text-2xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
            {row.original.secondary_muscles}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "equipment",
    header: "Equipment",
    cell: ({ row }) => (
      <span className="text-xs font-medium text-slate-600">
        {row.original.equipment_required}
      </span>
    ),
  },
  {
    accessorKey: "difficulty",
    header: "Difficulty",
    cell: ({ row }) => (
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-black uppercase tracking-widest border",
          row.original.difficulty_level === "beginner"
            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
            : row.original.difficulty_level === "intermediate"
              ? "bg-amber-50 text-amber-700 border-amber-100"
              : "bg-red-50 text-red-700 border-red-100",
        )}
      >
        {row.original.difficulty_level || "Medium"}
      </span>
    ),
  },
  {
    accessorKey: "steps_reps",
    header: "Steps / Reps",
    cell: ({ row }) => (
      <div className="text-xs font-medium text-slate-600">
        <div className="font-bold text-slate-800">
          {row.original.default_sets || "—"} sets
        </div>
        <div className="text-2xs text-slate-500">
          {row.original.default_reps_duration || "—"}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "rest_time",
    header: "Rest Time",
    cell: ({ row }) => (
      <span className="text-xs font-bold text-slate-700">
        {row.original.rest_time_seconds
          ? `${row.original.rest_time_seconds}s`
          : "—"}
      </span>
    ),
  },
  {
    accessorKey: "tier",
    header: "Tier",
    cell: ({ row }) => (
      <span
        className={cn(
          "text-2xs font-black uppercase tracking-widest px-2 py-0.5 rounded border",
          row.original.tier === "premium"
            ? "bg-purple-50 text-purple-700 border-purple-200"
            : "bg-slate-100 text-slate-600 border-slate-200",
        )}
      >
        {row.original.tier || "Pro"}
      </span>
    ),
  },
  {
    accessorKey: "is_featured",
    header: "Featured",
    cell: ({ row }) => (
      <div className="text-center">
        {row.original.is_featured ? (
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
        ) : (
          <span className="text-slate-300">○</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <span
        className={cn(
          "text-3xs font-black uppercase tracking-widest px-2 py-0.5 rounded border",
          row.original.status === "published"
            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
            : row.original.status === "archived"
              ? "bg-slate-100 text-slate-500 border-slate-200"
              : "bg-amber-50 text-amber-700 border-amber-100",
        )}
      >
        {row.original.status || "published"}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const exercise = row.original;
      const { open: openView } = useViewExerciseDialog();
      const { open: openEdit } = useAddExerciseDialog();
      const { mutate: deleteExercise, isPending: isDeleting } =
        useDeleteExercise();

      const handleDelete = (e: any) => {
        e.stopPropagation();
        if (
          globalThis.confirm(
            `Are you sure you want to delete "${exercise.exercise_name}"? This action cannot be undone.`,
          )
        ) {
          deleteExercise(exercise.id);
        }
      };

      return (
        <div className="flex items-center justify-end gap-2">
          <button aria-label="View Details"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              openView(exercise.id);
            }}
          >
            👁️
          </button>
          <button aria-label="Edit"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(exercise);
            }}
          >
            ✏️
          </button>
          <button aria-label="Delete"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            🗑️
          </button>
        </div>
      );
    },
  },
];
