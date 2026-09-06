"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Mail, Calendar, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { AdminInvite } from "@/features/users/data/useUser";

function inviteStatus(invite: AdminInvite): {
  label: string;
  className: string;
} {
  if (invite.is_revoked) {
    return { label: "Revoked", className: "bg-slate-100 text-slate-500 border-slate-200" };
  }
  if (invite.used_at) {
    return { label: "Accepted", className: "bg-emerald-50 text-emerald-700 border-emerald-100" };
  }
  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    return { label: "Expired", className: "bg-red-50 text-red-700 border-red-100" };
  }
  return { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-100" };
}

export const adminInviteColumns: ColumnDef<AdminInvite>[] = [
  {
    accessorKey: "email",
    header: "Invitee",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Mail className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-[11px] font-black text-slate-800 tracking-tight">
          {row.original.email}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
          {row.original.role.replace(/_/g, " ")}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = inviteStatus(row.original);
      return (
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
            status.className,
          )}
        >
          {status.label}
        </span>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Sent / Expires",
    cell: ({ row }) => (
      <div>
        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-600 tracking-tight leading-none mb-1">
          <Calendar className="w-3 h-3 text-slate-400" />
          {format(new Date(row.original.created_at), "MMM dd, yyyy")}
        </div>
        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
          Expires {format(new Date(row.original.expires_at), "MMM dd, yyyy")}
        </div>
      </div>
    ),
  },
];

export { inviteStatus };
