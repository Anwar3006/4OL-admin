import React from "react";
import { cn } from "@/lib/utils";

const activityData = [
  { label: "Total Actions (30d)", value: "1,247" },
  { label: "Critical Events", value: "3", color: "text-red-500" },
  { label: "High Risk Actions", value: "12", color: "text-ek-gold" },
  { label: "Most Active Admin", value: "Francis N.", color: "text-ek-green-dark" },
  { label: "Peak Activity", value: "9–11 AM WAT" },
];

const securityData = [
  { label: "Failed Logins (7d)", value: "4", color: "text-red-500" },
  { label: "Blocked IPs", value: "2" },
  { label: "MFA Events", value: "34" },
  { label: "Suspicious Activity", value: "1", color: "text-ek-gold" },
  { label: "Score Trend", value: "82 ↑ 3 pts", color: "text-ek-gold" },
];

const aiData = [
  { label: "AI Actions (30d)", value: "89" },
  { label: "Model Retrains", value: "4" },
  { label: "Moderation Overrides", value: "12" },
  { label: "False Positives Fixed", value: "7" },
  { label: "AI Confidence Avg", value: "94.2%", color: "text-ek-indigo" },
];

const MetricRow = ({ label, value, color }: { label: string, value: string, color?: string }) => (
  <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 text-xs font-bold">
    <span className="text-slate-500 font-medium">{label}</span>
    <span className={cn("text-slate-900", color)}>{value}</span>
  </div>
);

export default function ReportsTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="card">
        <div className="card-header border-b border-slate-100 mb-4"><h2 className="card-title text-[13px]">📊 Admin Activity Report</h2></div>
        <div className="space-y-0.5">
          {activityData.map((d, i) => <MetricRow key={i} {...d} />)}
        </div>
      </div>
      <div className="card">
        <div className="card-header border-b border-slate-100 mb-4"><h2 className="card-title text-[13px]">🛡️ Security Report</h2></div>
        <div className="space-y-0.5">
          {securityData.map((d, i) => <MetricRow key={i} {...d} />)}
        </div>
      </div>
      <div className="card">
        <div className="card-header border-b border-slate-100 mb-4"><h2 className="card-title text-[13px]">🤖 AI Audit Summary</h2></div>
        <div className="space-y-0.5">
          {aiData.map((d, i) => <MetricRow key={i} {...d} />)}
        </div>
      </div>
    </div>
  );
}
