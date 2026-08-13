"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useAdminDashboardMetrics } from "@/hooks/supabase-calls/useAdminDashboard";

interface AiAnalytics {
  usage: { requests: number; uniqueUsers: number };
  moderation: { flags: number; aiDetected: number; pending: number; avgConfidence: number };
}

const MetricRow = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 text-xs font-bold">
    <span className="text-slate-500 font-medium">{label}</span>
    <span className={cn("text-slate-900", color)}>{value}</span>
  </div>
);

function formatPeakHour(hour: number | null) {
  if (hour === null) return "Not enough data";
  const format12 = (h: number) => {
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12} ${period}`;
  };
  return `${format12(hour)}–${format12((hour + 1) % 24)} GMT`;
}

export default function ReportsTab() {
  const { data: adminMetrics, isLoading: adminLoading } = useAdminDashboardMetrics("30d");
  const { data: aiData, isLoading: aiLoading } = useQuery<AiAnalytics, Error>({
    queryKey: ["ai-analytics-30d"],
    queryFn: async () => {
      const res = await fetch("/api/ai/analytics?period=30d", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load AI analytics.");
      return res.json();
    },
  });

  const activity = adminMetrics?.activity;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="card">
        <div className="card-header border-b border-slate-100 mb-4"><h2 className="card-title text-[13px]">📊 Admin Activity Report</h2></div>
        <div className="space-y-0.5">
          {adminLoading ? (
            <div className="text-xs text-slate-400 py-4 text-center">Loading…</div>
          ) : (
            <>
              <MetricRow label="Total Actions (30d)" value={String(activity?.total_actions ?? 0)} />
              <MetricRow label="Critical Events" value={String(activity?.critical_events ?? 0)} color={activity?.critical_events ? "text-red-500" : undefined} />
              <MetricRow label="High Risk Actions" value={String(activity?.high_risk_actions ?? 0)} color={activity?.high_risk_actions ? "text-ek-gold" : undefined} />
              <MetricRow label="Most Active Admin" value={activity?.most_active_admin || "No activity yet"} color="text-ek-green-dark" />
              <MetricRow label="Peak Activity" value={formatPeakHour(activity?.peak_hour ?? null)} />
            </>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header border-b border-slate-100 mb-4"><h2 className="card-title text-[13px]">🛡️ Security Report</h2></div>
        <div className="space-y-0.5">
          {adminLoading ? (
            <div className="text-xs text-slate-400 py-4 text-center">Loading…</div>
          ) : (
            <>
              <MetricRow label="MFA Not Set" value={String(adminMetrics?.admins.mfa_not_set ?? 0)} color={adminMetrics?.admins.mfa_not_set ? "text-red-500" : undefined} />
              <MetricRow label="Online Now" value={String(adminMetrics?.admins.online_now ?? 0)} />
              <MetricRow label="Failed Logins (7d)" value="Awaiting instrumentation" color="text-slate-300" />
              <MetricRow label="Blocked IPs" value="Awaiting instrumentation" color="text-slate-300" />
              <MetricRow label="Suspicious Activity" value="Awaiting instrumentation" color="text-slate-300" />
            </>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header border-b border-slate-100 mb-4"><h2 className="card-title text-[13px]">🤖 AI Audit Summary</h2></div>
        <div className="space-y-0.5">
          {aiLoading ? (
            <div className="text-xs text-slate-400 py-4 text-center">Loading…</div>
          ) : (
            <>
              <MetricRow label="AI Requests (30d)" value={String(aiData?.usage.requests ?? 0)} />
              <MetricRow label="Flagged by AI" value={String(aiData?.moderation.aiDetected ?? 0)} />
              <MetricRow label="Pending Review" value={String(aiData?.moderation.pending ?? 0)} color={aiData?.moderation.pending ? "text-ek-gold" : undefined} />
              <MetricRow label="Avg AI Confidence" value={aiData?.moderation.aiDetected ? `${aiData.moderation.avgConfidence}%` : "No flags yet"} color="text-ek-indigo" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
