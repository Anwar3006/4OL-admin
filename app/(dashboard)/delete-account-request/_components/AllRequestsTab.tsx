import React from "react";
import DataTable, { Column } from "@/components/redesign/DataTable";

export interface AccountDeleteRequestRow {
  id: string;
  user: string;
  userId: string;
  phone: string;
  plan: string;
  reason: string;
  dataDownload: string;
  submitted: string;
  graceEnd: string;
  status: string;
}

const data: AccountDeleteRequestRow[] = [
  { 
    id: "DEL-2026-041", user: "Ama A****", userId: "4OL-204412", phone: "+233 24 *** 4412", 
    plan: "Pro", reason: "Privacy Concerns", dataDownload: "Downloaded", 
    submitted: "May 7, 2026", graceEnd: "Jun 6, 2026", status: "Pending" 
  },
  { 
    id: "DEL-2026-040", user: "Kofi B****", userId: "4OL-201205", phone: "+233 50 *** 1205", 
    plan: "Free", reason: "No Longer Using", dataDownload: "Not Started", 
    submitted: "May 5, 2026", graceEnd: "Jun 4, 2026", status: "Grace Period" 
  },
];

export default function AllRequestsTab() {
  const columns: Column<AccountDeleteRequestRow>[] = [
    { key: "id", label: "Request ID", render: (val) => <span className="font-mono text-[10px] font-bold text-slate-500">{val}</span> },
    { key: "user", label: "User", render: (val, row) => (
        <div>
            <div className="font-bold text-slate-800">{val}</div>
            <div className="text-[10px] text-slate-400">user#4412</div>
        </div>
    )},
    { key: "userId", label: "User ID", render: (val) => <span className="id-badge">{val}</span> },
    { key: "phone", label: "Phone", render: (val) => <span className="font-mono text-[10px] text-slate-500">{val}</span> },
    { key: "plan", label: "Plan", render: (val) => <span className="badge badge-purple">{val}</span> },
    { key: "reason", label: "Reason", render: (val) => <span className="text-[11px] font-bold text-slate-600">{val}</span> },
    { key: "dataDownload", label: "Data Download", render: (val) => (
        <span className={`badge ${val === 'Downloaded' ? 'badge-green' : 'badge-secondary'}`}>
            {val === 'Downloaded' ? '✅ Downloaded' : val}
        </span>
    )},
    { key: "submitted", label: "Submitted", render: (val) => <span className="text-[10px] font-bold text-slate-400">{val}</span> },
    { key: "graceEnd", label: "Grace End", render: (val) => <span className="text-[10px] font-bold text-red-500">{val}</span> },
    { key: "status", label: "Status", render: (val) => (
        <span className={`badge ${val === 'Pending' ? 'badge-amber' : val === 'Grace Period' ? 'badge-purple' : 'badge-green'}`}>
            {val === 'Pending' ? '⏳ Pending' : val}
        </span>
    )},
  ];

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input className="flex-1 min-w-[240px] h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none" placeholder="🔍 Search by User ID, name, phone, request ID..." />
        <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"><option>Status: All</option></select>
        <button className="btn btn-secondary btn-sm">📥 Export</button>
      </div>
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={data} selectable />
      </div>
    </div>
  );
}
