"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Star, Pencil, Trash2, ShieldCheck, Clock, Zap, Dumbbell } from "lucide-react";
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
    header: () => <div className="font-black text-[10px] uppercase tracking-widest px-8">Exercise Name</div>,
    cell: ({ row }) => (
      <div className="flex items-center gap-4 px-8">
        <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
           <Dumbbell className="h-6 w-6" />
        </div>
        <div className="flex flex-col">
          <span className="font-black text-slate-900">{row.original.exercise_name}</span>
          <div className="flex items-center gap-2 mt-0.5">
             <Badge variant="secondary" className="rounded-lg bg-slate-100 text-slate-600 font-bold border-none uppercase text-[9px] tracking-widest">
                {row.original.primary_body_part} {row.original.secondary_body_part ? `+ ${row.original.secondary_body_part}` : ''}
             </Badge>
          </div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: () => <div className="font-black text-[10px] uppercase tracking-widest">Category</div>,
    cell: ({ row }) => (
        <span className="font-bold text-slate-600 capitalize text-sm">N/A</span>
    ),
  },
  {
    accessorKey: "primary_body_part",
    header: () => <div className="font-black text-[10px] uppercase tracking-widest">Muscle Group</div>,
    cell: ({ row }) => (
        <span className="font-bold text-slate-600 text-sm">{row.original.primary_body_part}</span>
    ),
  },
  {
    accessorKey: "equipment_type",
    header: () => <div className="font-black text-[10px] uppercase tracking-widest">Equipment</div>,
    cell: ({ row }) => (
        <span className="font-bold text-slate-600 text-sm">{row.original.equipment_type}</span>
    ),
  },
  {
    accessorKey: "difficulty_level",
    header: () => <div className="font-black text-[10px] uppercase tracking-widest text-center">Difficulty</div>,
    cell: ({ row }) => (
        <div className="text-center">
            <Badge variant="outline" className={cn("rounded-lg font-bold text-[10px] uppercase tracking-wider px-2 py-0.5", difficultyColor[row.original.difficulty_level])}>
                {row.original.difficulty_level}
            </Badge>
        </div>
    ),
  },
  {
    accessorKey: "status",
    header: () => <div className="font-black text-[10px] uppercase tracking-widest text-center">Status</div>,
    cell: ({ row }) => (
        <div className="text-center">
            <Badge variant="outline" className={cn("rounded-lg font-bold text-[10px] uppercase tracking-wider px-2 py-0.5", statusColor[row.original.status])}>
                {row.original.status}
            </Badge>
        </div>
    ),
  },
  {
    id: "actions",
    header: () => <div className="font-black text-[10px] uppercase tracking-widest text-right px-8">Actions</div>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2 px-8">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
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
          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
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
