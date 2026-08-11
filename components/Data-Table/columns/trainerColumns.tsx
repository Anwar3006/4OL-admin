"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, ShieldCheck, Mail, Phone, Calendar, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TTrainerOutput } from "@/schemas/trainer.schema";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface TrainerColumnsProps {
  onEdit: (row: TTrainerOutput) => void;
  onDelete: (id: string) => void;
}

const statusColor: Record<string, string> = {
  active:    "bg-emerald-50 text-emerald-700 border-emerald-100",
  pending:   "bg-amber-50 text-amber-700 border-amber-100",
  suspended: "bg-red-50 text-red-700 border-red-100",
  rejected:  "bg-gray-100 text-gray-500 border-gray-200",
};

export const createTrainerColumns = ({
  onEdit,
  onDelete,
}: TrainerColumnsProps): ColumnDef<TTrainerOutput>[] => [
  {
    accessorKey: "user",
    header: () => <div className="font-semibold">Trainer</div>,
    cell: ({ row }) => {
        const u = row.original.user_profiles;
        if (!u) return <span className="text-xs text-slate-400 italic">User not linked</span>;
        
        const initials = `${u.first_name[0]}${u.last_name[0]}`;
        return (
            <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-slate-100">
                    <AvatarImage src={u.avatar_url || ""} />
                    <AvatarFallback className="font-bold text-xs bg-slate-50 text-slate-500">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden">
                    <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 truncate">{u.first_name} {u.last_name}</span>
                        {row.original.is_verified && <ShieldCheck className="h-3.5 w-3.5 text-blue-500 fill-blue-50" />}
                    </div>
                    <span className="text-[10px] text-slate-400 truncate">{u.email}</span>
                </div>
            </div>
        );
    }
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
    accessorKey: "expertise",
    header: () => <div className="font-semibold">Expertise</div>,
    cell: ({ row }) => (
      <div className="flex flex-col gap-1 min-w-40">
        <span className="text-xs font-bold text-slate-700">{row.original.years_experience} years experience</span>
        <div className="flex flex-wrap gap-1">
             {row.original.specialties?.slice(0, 2).map(s => (
                 <span key={s} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                    {s}
                </span>
             ))}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "stats",
    header: () => <div className="font-semibold text-center">Sessions</div>,
    cell: ({ row }) => (
        <div className="text-center space-y-1">
            <div className="text-xs font-bold text-slate-900">{row.original.total_sessions}</div>
            <div className="text-[10px] text-slate-400 font-medium">{row.original.total_clients} active clients</div>
        </div>
    ),
  },
  {
    id: "actions",
    header: () => <div className="font-semibold text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
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
