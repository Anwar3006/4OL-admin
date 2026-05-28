import React from "react";
import DataTable, { Column, RowAction } from "@/components/redesign/DataTable";
import { Eye, Ban } from "lucide-react";

export interface FlaggedUserRow {
  id: string;
  name: string;
  reason: string;
  flaggedBy: string;
  dateFlagged: string;
  reports: string;
}

const flaggedUsers: FlaggedUserRow[] = [
  {
    id: "4OL-002910", name: "Abena O****", reason: "Selling prescription drugs via DM",
    flaggedBy: "AI Moderation", dateFlagged: "May 6, 2026", reports: "8 reports"
  },
  {
    id: "4OL-009012", name: "Unknown U****", reason: "Spreading medical misinformation",
    flaggedBy: "User Reports", dateFlagged: "May 4, 2026", reports: "3 reports"
  },
];

export default function FlaggedUsersTab() {
  const columns: Column<FlaggedUserRow>[] = [
    {
      key: "user",
      label: "User",
      render: (_, row) => (
        <div>
          <div className="font-bold text-slate-800">{row.name}</div>
          <div className="text-[10px] text-slate-400">{row.id}</div>
        </div>
      )
    },
    { key: "reason", label: "Flag Reason", render: (val) => <span className="text-red-500 text-xs">{val}</span> },
    { key: "flaggedBy", label: "Flagged By" },
    { key: "dateFlagged", label: "Date Flagged" },
    { key: "reports", label: "Reports", render: (val) => <span className="font-bold text-red-500">{val}</span> },
  ];

  const rowActions: RowAction<FlaggedUserRow>[] = [
    { label: "View", icon: <Eye className="w-4 h-4" />, onClick: (row) => console.log('View', row.id) },
    { label: "Clear Flag", icon: <Ban className="w-4 h-4" />, onClick: (row) => console.log('Clear Flag', row.id) },
  ];

  return (
    <div className="space-y-4">
      <div className="alert bg-red-50 border border-red-200 text-xs p-3 rounded-lg flex items-start gap-2">
        <span className="text-lg">⚠️</span>
        <div className="flex-1">
          <strong className="text-red-700">12 flagged users</strong> – potential abuse, fraud, or misinformation. Review and take action.
        </div>
      </div>
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={flaggedUsers} selectable rowActions={rowActions} />
      </div>
    </div>
  );
}
