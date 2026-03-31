"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Star, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TWorkoutOutput } from "@/schemas/workout.schema";

interface WorkoutColumnsProps {
  onEdit: (row: TWorkoutOutput) => void;
  onDelete: (id: string) => void;
}

export const createWorkoutColumns = ({
  onEdit,
  onDelete,
}: WorkoutColumnsProps): ColumnDef<TWorkoutOutput>[] => [
  {
    accessorKey: "exercise_name",
    header: () => <div className="font-semibold">Exercise Name</div>,
    cell: ({ row }) => (
      <div className="font-medium text-sm min-w-40">
        {row.original.exercise_name}
      </div>
    ),
  },
  {
    accessorKey: "primary_body_part",
    header: () => (
      <div className="font-semibold hidden md:table-cell">Primary Body Part</div>
    ),
    cell: ({ row }) => (
      <div className="hidden md:table-cell min-w-35">
        <span className="text-sm text-blue-600 font-medium">
          {row.original.primary_body_part}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "secondary_body_part",
    header: () => (
      <div className="font-semibold hidden lg:table-cell">Secondary Body Part</div>
    ),
    cell: ({ row }) => (
      <div className="hidden lg:table-cell min-w-35">
        <span className="text-sm text-muted-foreground">
          {row.original.secondary_body_part || "—"}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "equipment_type",
    header: () => (
      <div className="font-semibold hidden xl:table-cell">Equipment</div>
    ),
    cell: ({ row }) => (
      <div className="hidden xl:table-cell min-w-35">
        <span className="text-sm">{row.original.equipment_type}</span>
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
