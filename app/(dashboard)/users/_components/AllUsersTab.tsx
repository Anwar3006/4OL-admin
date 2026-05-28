import React from "react";
import DataTable, { Column, RowAction } from "@/components/redesign/DataTable";
import { User, Mail, Phone, Calendar, Star, MoreHorizontal, Eye, Pencil, Trash2, Ban, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  plan: string;
  planVariant: string;
  status: string;
  statusVariant: string;
  joined: string;
  lastActive: string;
  country: string;
}

const users: UserRow[] = [
  {
    id: "4OL-001234", name: "Akua Mensah", email: "akua.mensah@gmail.com", phone: "+233241234567",
    plan: "Premium", planVariant: "gold", status: "Active", statusVariant: "green",
    joined: "Jan 1, 2024", lastActive: "Just now", country: "Ghana",
  },
  {
    id: "4OL-005678", name: "Kwame Asante", email: "kwame.asante@gmail.com", phone: "+233501234567",
    plan: "Free", planVariant: "blue", status: "Active", statusVariant: "green",
    joined: "Feb 15, 2024", lastActive: "1 hour ago", country: "Ghana",
  },
  {
    id: "4OL-009012", name: "Adwoa Boateng", email: "adwoa.boateng@gmail.com", phone: "+233201234567",
    plan: "Free", planVariant: "blue", status: "Inactive", statusVariant: "red",
    joined: "Mar 10, 2024", lastActive: "30 days ago", country: "Ghana",
  },
];

export default function AllUsersTab() {
  const columns: Column<UserRow>[] = [
    { 
      key: "user", 
      label: "User", 
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-sm">
            <User className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-800">{row.name}</div>
            <div className="text-[10px] text-slate-400">{row.id}</div>
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
          <div className="flex items-center gap-1.5 text-xs text-slate-600"><Phone className="w-3 h-3" />{row.phone}</div>
        </div>
      )
    },
    { key: "country", label: "Country" },
    { 
      key: "plan", 
      label: "Plan",
      render: (val, row) => <span className={cn("badge", `badge-${row.planVariant}`)}>{val}</span>
    },
    { 
      key: "status", 
      label: "Status",
      render: (val, row) => <span className={cn("badge", `badge-${row.statusVariant}`)}>{val}</span>
    },
    { 
      key: "activity", 
      label: "Activity",
      render: (_, row) => (
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600"><Calendar className="w-3 h-3" />{row.joined}</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600"><Activity className="w-3 h-3" />{row.lastActive}</div>
        </div>
      )
    },
  ];

  const rowActions: RowAction<UserRow>[] = [
    { label: "View User", icon: <Eye className="w-4 h-4" />, onClick: (row) => console.log('View', row.id) },
    { label: "Edit User", icon: <Pencil className="w-4 h-4" />, onClick: (row) => console.log('Edit', row.id) },
    { label: "Flag User", icon: <Ban className="w-4 h-4" />, onClick: (row) => console.log('Flag', row.id), danger: true },
    { label: "Delete User", icon: <Trash2 className="w-4 h-4" />, onClick: (row) => console.log('Delete', row.id), danger: true },
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

      <div className="flex gap-2">
        <span className="text-[11px] text-slate-500 line-height-[28px]">Bulk Actions:</span>
        <button className="btn btn-secondary btn-sm">✅ Approve</button>
        <button className="btn btn-secondary btn-sm">⭐ Upgrade to Premium</button>
        <button className="btn btn-secondary btn-sm">📧 Send Notification</button>
        <button className="btn btn-danger btn-sm">🚩 Flag</button>
        <button className="btn btn-danger btn-sm">🗑️ Delete</button>
      </div>
    </div>
  );
}

