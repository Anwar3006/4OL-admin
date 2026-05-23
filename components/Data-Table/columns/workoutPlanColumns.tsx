"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, ShieldCheck, Clock, ListChecks, Target, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TWorkoutPlanOutput } from "@/schemas/workout-plan.schema";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface WorkoutPlanColumnsProps {
  onEdit: (row: TWorkoutPlanOutput) => void;
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

export const createWorkoutPlanColumns = ({
  onEdit,
  onDelete,
}: WorkoutPlanColumnsProps): ColumnDef<TWorkoutPlanOutput>[] => [
  {
    accessorKey: "title",
    header: () => <div className="font-semibold">Plan Details</div>,
    cell: ({ row }) => (
      <div className="flex flex-col min-w-48">
        <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">{row.original.title}</span>
            {row.original.is_featured && (
                <Badge className="bg-indigo-500 hover:bg-indigo-600 border-none px-1.5 h-4 text-[9px] uppercase font-black text-white gap-0.5">
                    <Star className="w-2.5 h-2.5 fill-current" /> FEATURED
                </Badge>
            )}
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
             {row.original.target_body_parts?.slice(0, 2).map(part => (
                 <span key={part} className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    {part}
                </span>
             ))}
             {row.original.target_body_parts?.length > 2 && (
                 <span className="text-[10px] text-slate-400 font-bold">+{row.original.target_body_parts.length - 2}</span>
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
    accessorKey: "structure",
    header: () => <div className="font-semibold">Structure</div>,
    cell: ({ row }) => (
      <div className="space-y-1 min-w-32">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {row.original.duration_weeks} weeks
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <ListChecks className="w-3.5 h-3.5 text-slate-400" />
            {row.original.workouts_per_week} workouts / week
        </div>
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
    accessorKey: "stats",
    header: () => <div className="font-semibold text-center">Popularity</div>,
    cell: ({ row }) => (
        <div className="text-center space-y-1">
            <div className="text-xs font-bold text-slate-900">{row.original.total_completions} completions</div>
            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {row.original.average_rating.toFixed(1)} ({row.original.rating_count})
            </div>
        </div>
    ),
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
