"use client";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Mail, Phone, Calendar, UserCheck, ShieldAlert, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const statusColor: Record<string, string> = {
  active:    "bg-emerald-50 text-emerald-700 border-emerald-100",
  inactive:  "bg-slate-100 text-slate-600 border-slate-200",
  suspended: "bg-red-50 text-red-700 border-red-100",
  banned:    "bg-gray-900 text-white border-none",
};

export const fitnessUserColumns: ColumnDef<any>[] = [
  {
    accessorKey: "user",
    header: () => <div className="font-semibold">Participant</div>,
    cell: ({ row }) => {
        const u = row.original;
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
                        {u.is_premium && <Badge className="bg-amber-500 h-3.5 px-1 text-[8px] font-black">PRO</Badge>}
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
    accessorKey: "engagement",
    header: () => <div className="font-semibold">Engagement</div>,
    cell: ({ row }) => (
      <div className="space-y-1 min-w-32">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Joined {format(new Date(row.original.created_at), "MMM yyyy")}
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
            Last seen {row.original.last_login_at ? format(new Date(row.original.last_login_at), "MMM d") : "Never"}
        </div>
      </div>
    ),
  },
  {
    id: "actions",
    header: () => <div className="sr-only">Actions</div>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:bg-blue-50">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
    ),
  },
];
