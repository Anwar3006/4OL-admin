"use client";

import React, { useMemo } from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { useHasPermission } from "@/stores/permission-context";

interface FlaggedUserRow {
  id: string;
  userId: string;
  name: string;
  userStatus: string;
  reason: string;
  status: string;
  flaggedBy: string;
  reportedBy: string | null;
  createdAt: string;
}

export default function FlaggedUsersTab() {
  const queryClient = useQueryClient();
  const canModerate = useHasPermission("ai.manage");

  const { data, isLoading, isError } = useQuery<{ items: FlaggedUserRow[]; total: number }, Error>({
    queryKey: ["admin-flagged-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users/flag?status=pending_review&limit=50", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load flagged users.");
      return res.json();
    },
  });

  const flags = data?.items ?? [];

  const takeAction = async (flagId: string, action: "dismiss" | "warn" | "remove" | "ban") => {
    try {
      const res = await fetch("/api/ai/moderation-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: flagId, action }),
      });
      if (!res.ok) throw new Error("Action failed");
      toast.success(`Flag ${action === "dismiss" ? "dismissed" : `actioned (${action})`}`);
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-users"] });
      queryClient.invalidateQueries({ queryKey: ["user-dashboard-metrics"] });
    } catch {
      toast.error("Failed to update flag");
    }
  };

  const columns = useMemo<ColumnDef<FlaggedUserRow>[]>(
    () => [
      {
        id: "user",
        header: "User",
        cell: ({ row }) => (
          <div>
            <div className="font-bold text-slate-800">{row.original.name}</div>
            <div className="text-2xs text-slate-400 uppercase">{row.original.userStatus}</div>
          </div>
        ),
      },
      {
        accessorKey: "reason",
        header: "Flag Reason",
        cell: ({ row }) => <span className="text-red-500 text-xs">{row.original.reason}</span>,
      },
      {
        id: "flaggedBy",
        header: "Flagged By",
        cell: ({ row }) => (
          <span className={row.original.flaggedBy === "AI Moderation" ? "badge badge-purple" : "badge badge-blue"}>
            {row.original.flaggedBy === "AI Moderation" ? "🤖 AI Moderation" : "👤 User Reports"}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Date Flagged",
        cell: ({ row }) => format(new Date(row.original.createdAt), "MMM dd, yyyy"),
      },
    ],
    [],
  );

  const rowActions = useMemo(
    () =>
      canModerate
        ? [
            { label: "Dismiss", onClick: (row: FlaggedUserRow) => takeAction(row.id, "dismiss") },
            { label: "Warn", onClick: (row: FlaggedUserRow) => takeAction(row.id, "warn") },
            { label: "Suspend", onClick: (row: FlaggedUserRow) => takeAction(row.id, "remove") },
            { label: "Ban", onClick: (row: FlaggedUserRow) => takeAction(row.id, "ban") },
          ]
        : [],
    [canModerate],
  );

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className={`alert border text-xs p-3 rounded-lg flex items-start gap-2 ${flags.length > 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
        <span className="text-lg">{flags.length > 0 ? "⚠️" : "✅"}</span>
        <div className="flex-1">
          <strong className={flags.length > 0 ? "text-red-700" : "text-emerald-700"}>
            {isLoading ? "Loading…" : `${flags.length} flagged user${flags.length === 1 ? "" : "s"}`}
          </strong>{" "}
          {flags.length > 0 ? "– potential abuse, fraud, or misinformation. Review and take action." : "No pending user flags."}
        </div>
      </div>
      <div className="card p-0 overflow-hidden">
        {isError ? (
          <div className="text-center text-red-500 text-xs py-6">Failed to load flagged users.</div>
        ) : (
          <DataTable columns={columns} data={flags} isLoading={isLoading} rowActions={rowActions} />
        )}
      </div>
    </div>
  );
}
