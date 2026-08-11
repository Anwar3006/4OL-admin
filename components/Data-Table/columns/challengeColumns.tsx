"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, Trophy, Users, Calendar, Target, Award, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TChallengeOutput } from "@/schemas/challenge.schema";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ChallengeColumnsProps {
  onEdit: (row: TChallengeOutput) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}

const statusColor: Record<string, string> = {
  active:    "bg-emerald-50 text-emerald-700 border-emerald-100",
  upcoming:  "bg-blue-50 text-blue-700 border-blue-100",
  draft:     "bg-slate-100 text-slate-600 border-slate-200",
  completed: "bg-purple-50 text-purple-700 border-purple-100",
  cancelled: "bg-red-50 text-red-700 border-red-100",
};

export const createChallengeColumns = ({
  onEdit,
  onDelete,
  onView,
}: ChallengeColumnsProps): ColumnDef<TChallengeOutput>[] => [
  {
    accessorKey: "title",
    header: () => <div className="font-semibold">Challenge</div>,
    cell: ({ row }) => (
      <div className="flex flex-col min-w-48">
        <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">{row.original.title}</span>
            {!row.original.is_public && (
                <Badge variant="outline" className="text-[9px] uppercase px-1.5 h-4 font-black">PRIVATE</Badge>
            )}
        </div>
        <div className="flex items-center gap-2 mt-1">
             <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                {row.original.challenge_type}
            </span>
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
    accessorKey: "goal",
    header: () => <div className="font-semibold">Goal</div>,
    cell: ({ row }) => (
      <div className="space-y-1 min-w-32">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <Target className="w-3.5 h-3.5 text-slate-400" />
            {row?.original.goal_value?.toLocaleString()} {row.original.goal_metric}
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            {row.original.current_participants} participants
        </div>
      </div>
    ),
  },
  {
    accessorKey: "timeline",
    header: () => <div className="font-semibold text-center">Timeline</div>,
    cell: ({ row }) => (
        <div className="text-center space-y-1">
            <div className="text-[10px] font-bold text-slate-700">
                {format(new Date(row.original.start_date), "MMM d")} - {format(new Date(row.original.end_date), "MMM d")}
            </div>
            <div className="text-[9px] text-slate-400 uppercase tracking-widest font-medium">
                {row.original.status === 'draft' ? 'Starts soon' : 'In progress'}
            </div>
        </div>
    ),
  },
  {
    id: "actions",
    header: () => <div className="font-semibold text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <Button aria-label="View Details"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
          onClick={(e) => {
            e.stopPropagation();
            onView(row.original.id!);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button aria-label="Edit"
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
        <Button aria-label="Delete"
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
