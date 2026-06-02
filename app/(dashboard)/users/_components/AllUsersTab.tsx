import React, { useState } from "react";
import DataTable, { Column, RowAction } from "@/components/redesign/DataTable";
import { User, Mail, Phone, Calendar, MoreHorizontal, Eye, Pencil, Trash2, Ban, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUsers } from "@/hooks/supabase-calls/useUser";
import { format } from "date-fns";

export default function AllUsersTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useUsers({ admin: false, page, limit: 10 });

  const users = data?.users || [];

  const columns: Column<any>[] = [
    { 
      key: "user", 
      label: "User", 
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-sm">
            {row.avatar_url ? <img src={row.avatar_url} alt="" className="w-8 h-8 rounded-full" /> : <User className="w-4 h-4" />}
          </div>
          <div>
            <div className="font-bold text-slate-800">{row.name}</div>
            <div className="text-[10px] text-slate-400">{row.user_id}</div>
          </div>
        </div>
      )
    },
    { 
      key: "contact", 
      label: "Contact", 
      render: (_, row) => (
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600"><Mail className="w-3 h-3" />{row.email}</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600"><Phone className="w-3 h-3" />{row.phone_number || 'N/A'}</div>
        </div>
      )
    },
    { key: "user_type", label: "Type", render: (val) => <span className="capitalize">{val}</span> },
    { 
      key: "status", 
      label: "Status",
      render: (val) => <span className={cn("badge", val === 'active' ? 'badge-green' : 'badge-red')}>{val}</span>
    },
    { 
      key: "activity", 
      label: "Activity",
      render: (_, row) => (
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600"><Calendar className="w-3 h-3" />{format(new Date(row.created_at), "MMM dd, yyyy")}</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600"><Activity className="w-3 h-3" />{row.last_active ? format(new Date(row.last_active), "MMM dd, HH:mm") : 'Never'}</div>
        </div>
      )
    },
  ];

  const rowActions: RowAction<any>[] = [
    { label: "View User", icon: <Eye className="w-4 h-4" />, onClick: (row) => console.log('View', row.user_id) },
    { label: "Edit User", icon: <Pencil className="w-4 h-4" />, onClick: (row) => console.log('Edit', row.user_id) },
    { label: "Flag User", icon: <Ban className="w-4 h-4" />, onClick: (row) => console.log('Flag', row.user_id), danger: true },
    { label: "Delete User", icon: <Trash2 className="w-4 h-4" />, onClick: (row) => console.log('Delete', row.user_id), danger: true },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input className="flex-1 min-w-[200px] h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none" placeholder="🔍 Search users by name, email, ID..." />
        <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"><option>All Plans</option></select>
        <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"><option>All Status</option></select>
        <button className="btn btn-secondary btn-sm">📥 Export CSV</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={users} selectable rowActions={rowActions} />
      </div>
    </div>
  );
}

