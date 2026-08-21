"use client";

import React from "react";
import { useFitnessHealthSyncStats } from "@/hooks/supabase-calls/useFitnessAnalytics";

/**
 * Health Integrations tab (Gap Analysis Part V, tab 11). V-D2: real
 * HealthKit / Health Connect ingestion happens on the mobile side — this
 * admin tab is a registry + sync-failure monitor over
 * fitness_health_platforms / fitness_health_sync_logs. Settings writes stay
 * super_admin-only via the existing integrations surface.
 */

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Never";

const HealthTab = () => {
  const { data, isLoading, isError } = useFitnessHealthSyncStats();

  const platforms = data?.platforms ?? [];
  const failures = data?.recent_failures ?? [];

  const enabledCount = platforms.filter((p) => p.is_enabled).length;
  const totalSuccess = platforms.reduce((sum, p) => sum + Number(p.sync_success || 0), 0);
  const totalFailures = platforms.reduce((sum, p) => sum + Number(p.sync_failures || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPI strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="card">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            📱 Registered Platforms
          </div>
          <div className="text-2xl font-black text-slate-800">
            {isLoading ? "..." : platforms.length.toLocaleString()}
          </div>
        </div>
        <div className="card">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            ✅ Enabled
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {isLoading ? "..." : enabledCount.toLocaleString()}
          </div>
        </div>
        <div className="card">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            🔄 Successful Syncs
          </div>
          <div className="text-2xl font-black text-blue-600">
            {isLoading ? "..." : totalSuccess.toLocaleString()}
          </div>
        </div>
        <div className="card">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            ⚠️ Failed Syncs
          </div>
          <div className="text-2xl font-black text-red-600">
            {isLoading ? "..." : totalFailures.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Connected platforms table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
        <div className="px-6 pt-5 pb-3">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">
            Connected Platforms
          </h3>
        </div>
        <table className="w-full text-left min-w-[760px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {["Platform", "Sync Frequency", "Successful", "Failed", "Last Sync", "Status"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                  Loading platforms...
                </td>
              </tr>
            )}
            {!isLoading && isError && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-red-600">
                  Failed to load health platforms. Try refreshing the page.
                </td>
              </tr>
            )}
            {!isLoading && !isError && platforms.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                  No health platforms registered yet.
                </td>
              </tr>
            )}
            {platforms.map((platform) => (
              <tr key={platform.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-6 py-3 text-[11px] font-black text-slate-800">
                  {platform.platform_name}
                </td>
                <td className="px-6 py-3 text-[11px] font-semibold text-slate-600">
                  Every {platform.sync_frequency_mins ?? 60} min
                </td>
                <td className="px-6 py-3 text-[11px] font-bold text-emerald-700">
                  {Number(platform.sync_success || 0).toLocaleString()}
                </td>
                <td className="px-6 py-3 text-[11px] font-bold text-red-600">
                  {Number(platform.sync_failures || 0).toLocaleString()}
                </td>
                <td className="px-6 py-3 text-[11px] text-slate-500">
                  {formatDate(platform.last_sync_at)}
                </td>
                <td className="px-6 py-3">
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                      platform.is_enabled
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {platform.is_enabled ? "Enabled" : "Disabled"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent sync failures */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
        <div className="px-6 pt-5 pb-3">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">
            Recent Sync Failures
          </h3>
        </div>
        <table className="w-full text-left min-w-[760px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {["User", "Platform", "Error", "Failed At", "Retries"].map((h) => (
                <th
                  key={h}
                  className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!isLoading && failures.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-slate-400">
                  No recent sync failures. 🎉
                </td>
              </tr>
            )}
            {failures.map((failure, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-6 py-3 text-[11px] font-bold text-slate-700">
                  {failure.user_name || "Unknown user"}
                </td>
                <td className="px-6 py-3 text-[11px] font-semibold text-slate-600">
                  {failure.platform_name || "—"}
                </td>
                <td className="px-6 py-3 text-[11px] text-slate-500 max-w-[280px] truncate">
                  {failure.error_details || "No error details recorded"}
                </td>
                <td className="px-6 py-3 text-[11px] text-slate-500 whitespace-nowrap">
                  {formatDate(failure.synced_at)}
                </td>
                <td className="px-6 py-3 text-[11px] font-bold text-slate-700">
                  {failure.retry_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* GH-DPA compliance note */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-[11px] font-medium text-blue-800">
        🔒 <span className="font-black">Ghana Data Protection Act (2012) note:</span>{" "}
        health sync data is biometric personal data. Platform registrations and
        sync-frequency changes are super_admin-only, sync failures must be
        reviewed within 30 days, and ingestion itself happens on the mobile
        device — this console is a registry and failure monitor only.
      </div>
    </div>
  );
};

export default HealthTab;
