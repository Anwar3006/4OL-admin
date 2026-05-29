import DataTable, { Column, RowAction } from "@/components/redesign/DataTable";
import { Eye, Pencil, Trash2 } from "lucide-react";

export interface GroupRow {
  name: string;
  sub: string;
  category: string;
  members: string;
  admin: string;
  msgs: string;
  status: string;
  created: string;
}

const groups: GroupRow[] = [
  { name: "General Practitioners Ghana", sub: "Verified MDC-licensed GPs only", category: "HCP Professional", members: "620", admin: "Dr. Abena Mensah", msgs: "1,840", status: "Active", created: "Jan 12, 2025" },
];

export default function GroupsTab() {
  const columns: Column<GroupRow>[] = [
    { key: "name", label: "Group Name", render: (val, row) => (
        <div><div className="font-bold text-slate-800">{val}</div><div className="text-[10px] text-slate-400">{row.sub}</div></div>
    )},
    { key: "category", label: "Category", render: (val) => <span className="badge badge-green">{val}</span> },
    { key: "members", label: "Members", render: (val) => <span className="font-black">{val}</span> },
    { key: "admin", label: "Group Admin", render: (val) => <div className="text-[11px] font-bold text-slate-700">{val}</div> },
    { key: "msgs", label: "Messages (7d)", render: (val) => <span className="font-bold text-ek-green-dark">{val}</span> },
    { key: "status", label: "Status", render: (val) => <span className="badge badge-green">{val}</span> },
    { key: "created", label: "Created", render: (val) => <span className="text-[10px] text-slate-400">{val}</span> },
  ];

  const rowActions: RowAction<GroupRow>[] = [
    { label: "View", icon: <Eye className="w-4 h-4" />, onClick: () => {} },
    { label: "Edit", icon: <Pencil className="w-4 h-4" />, onClick: () => {} },
    { label: "Delete", icon: <Trash2 className="w-4 h-4" />, onClick: () => {}, danger: true },
  ];

  return (
    <div className="space-y-4 mt-4">
      <div className="alert bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-lg flex items-center gap-3">
        <span className="text-base">🔍</span>
        <div className="flex-1 text-[11px] font-medium">
          <strong className="font-black">Super Admin:</strong> Global Message Search — Search across all 48 group histories.
        </div>
        <div className="flex gap-2">
            <input className="h-7 px-2 rounded-lg border border-blue-200 text-[11px] w-48 outline-none" placeholder="Search all messages..." />
            <button className="btn btn-primary btn-sm h-7 text-white text-[10px]">Search</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input className="flex-1 min-w-[240px] h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none" placeholder="🔍 Search groups by name, category, admin..." />
        <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"><option>All Categories</option></select>
        <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"><option>All Status</option></select>
        <button className="btn btn-primary btn-sm text-white">+ Create Group</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={groups} selectable rowActions={rowActions} />
      </div>
    </div>
  );
}
