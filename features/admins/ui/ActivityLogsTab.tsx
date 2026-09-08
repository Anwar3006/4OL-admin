"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface AuditLogRow {
  id: string;
  admin_email: string | null;
  action_type: string;
  target_table: string;
  ip_address: string | null;
  severity: "info" | "warning" | "critical";
  created_at: string;
}

const SEVERITY_BADGE: Record<string, string> = {
  info: "badge-green",
  warning: "badge-amber",
  critical: "badge-red",
};

export default function ActivityLogsTab() {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery<{ logs: AuditLogRow[]; total: number }, Error>({
    queryKey: ["admin-activity-logs"],
    queryFn: async () => {
      const res = await fetch("/api/security/audit-logs?limit=50", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load activity logs.");
      return res.json();
    },
  });

  const logs = (data?.logs ?? []).filter((log) =>
    search
      ? `${log.admin_email ?? ""} ${log.action_type} ${log.target_table}`
          .toLowerCase()
          .includes(search.toLowerCase())
      : true,
  );

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[200px] h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none"
          placeholder="🔍 Search logs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Module</th>
                <th>IP Address</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="text-center text-slate-400 text-xs py-6">Loading…</td></tr>
              )}
              {isError && (
                <tr><td colSpan={6} className="text-center text-red-500 text-xs py-6">Failed to load activity logs.</td></tr>
              )}
              {!isLoading && !isError && logs.length === 0 && (
                <tr><td colSpan={6} className="text-center text-slate-400 text-xs py-6">No admin activity recorded yet.</td></tr>
              )}
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="font-mono text-2xs text-slate-400">
                    {format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")}
                  </td>
                  <td><span className="badge badge-secondary">{log.admin_email || "Unknown"}</span></td>
                  <td className="font-bold text-slate-700 dark:text-slate-300">{log.action_type}</td>
                  <td><span className="text-2xs font-bold text-slate-500 uppercase">{log.target_table}</span></td>
                  <td className="font-mono text-2xs">{log.ip_address || "—"}</td>
                  <td><span className={`badge font-extrabold ${SEVERITY_BADGE[log.severity] || "badge-secondary"}`}>{log.severity.toUpperCase()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
