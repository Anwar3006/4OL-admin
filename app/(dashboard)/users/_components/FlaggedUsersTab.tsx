import React, { useMemo } from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { ColumnDef } from "@tanstack/react-table";
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
  const columns = useMemo<ColumnDef<FlaggedUserRow>[]>(
    () => [
    {
      id: "user",
      header: "User",
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-slate-800">{row.original.name}</div>
          <div className="text-[10px] text-slate-400">{row.original.id}</div>
        </div>
      ),
    },
    {
      accessorKey: "reason",
      header: "Flag Reason",
      cell: ({ row }) => <span className="text-red-500 text-xs">{row.original.reason}</span>,
    },
    { accessorKey: "flaggedBy", header: "Flagged By" },
    { accessorKey: "dateFlagged", header: "Date Flagged" },
    {
      accessorKey: "reports",
      header: "Reports",
      cell: ({ row }) => <span className="font-bold text-red-500">{row.original.reports}</span>,
    },
    ],
    [],
  );

  const rowActions = useMemo(
    () => [
    { label: "View", icon: <Eye className="w-4 h-4" />, onClick: (row: FlaggedUserRow) => console.log('View', row.id) },
    { label: "Clear Flag", icon: <Ban className="w-4 h-4" />, onClick: (row: FlaggedUserRow) => console.log('Clear Flag', row.id) },
    ],
    [],
  );

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="alert bg-red-50 border border-red-200 text-xs p-3 rounded-lg flex items-start gap-2">
        <span className="text-lg">⚠️</span>
        <div className="flex-1">
          <strong className="text-red-700">12 flagged users</strong> – potential abuse, fraud, or misinformation. Review and take action.
        </div>
      </div>
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={flaggedUsers} rowActions={rowActions} />
      </div>
    </div>
  );
}
