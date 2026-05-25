"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Star, Pencil, Trash2, ShieldCheck, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TExerciseOutput } from "@/schemas/exercise.schema";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ExerciseColumnsProps {
  onEdit: (row: TExerciseOutput) => void;
  onDelete: (id: string) => void;
}

const statusColor: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-700 border-emerald-100",
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  archived: "bg-amber-50 text-amber-700 border-amber-100",
};

const difficultyColor: Record<string, string> = {
  beginner: "bg-blue-50 text-blue-700 border-blue-100",
  intermediate: "bg-indigo-50 text-indigo-700 border-indigo-100",
  advanced: "bg-purple-50 text-purple-700 border-purple-100",
  expert: "bg-rose-50 text-rose-700 border-rose-100",
};

export const createExerciseColumns = ({
  onEdit,
  onDelete,
}: ExerciseColumnsProps): ColumnDef<TExerciseOutput>[] => [
  {
    accessorKey: "exercise_name",
    header: () => <div className="font-semibold">Exercise Name</div>,
    cell: ({ row }) => (
      <div className="flex flex-col min-w-48">
        <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">{row.original.exercise_name}</span>
            {row.original.is_premium && (
                <Badge className="bg-amber-500 hover:bg-amber-600 border-none px-1.5 h-4 text-[9px] uppercase font-black text-white gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5" /> PRO
                </Badge>
            )}
        </div>
        <div className="flex items-center gap-2 mt-1">
             <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                {row.original.primary_body_part}
            </span>
            {row.original.secondary_body_part && (
                <>
                    <span className="text-slate-300">•</span>
                    <span className="text-[10px] text-slate-400 uppercase font-medium">
                        {row.original.secondary_body_part}
                    </span>
                </>
            )}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: () => <div className="font-semibold text-center">Status</div>,
    cell: ({ row }) => (
        <div className="text-center">
            <Badge variant="outline" className={cn("rounded-lg font-bold text-[10px] uppercase tracking-wider px-2 py-0.5", statusColor[row.original.status])}>
                {row.original.status}
            </Badge>
        </div>
    ),
  },
  {
    accessorKey: "difficulty_level",
    header: () => <div className="font-semibold text-center">Level</div>,
    cell: ({ row }) => (
        <div className="text-center">
            <Badge variant="outline" className={cn("rounded-lg font-bold text-[10px] uppercase tracking-wider px-2 py-0.5", difficultyColor[row.original.difficulty_level])}>
                {row.original.difficulty_level}
            </Badge>
        </div>
    ),
  },
  {
    accessorKey: "metrics",
    header: () => <div className="font-semibold">Metrics</div>,
    cell: ({ row }) => (
      <div className="space-y-1 min-w-32">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {row.original.duration_minutes} mins
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            {row.original.calories_burned} kcal
        </div>
      </div>
    ),
  },
  {
    accessorKey: "intensity",
    header: () => (
      <div className="font-semibold hidden sm:table-cell">Intensity</div>
    ),
    cell: ({ row }) => {
      const level = row.original.intensity ?? 0;
      return (
        <div className="hidden sm:flex items-center gap-0.5 min-w-24">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3.5 w-3.5 ${
                i < level
                  ? "fill-amber-400 text-amber-400"
                  : "text-gray-200 fill-gray-200"
              }`}
            />
          ))}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="font-semibold text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(row.original);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-600 hover:text-red-600 hover:bg-red-50"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(row.original.id!);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
  },
];
