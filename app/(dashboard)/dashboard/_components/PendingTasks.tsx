import React from "react";
const tasks = [
  { label: "12 Facilities Pending Approval", variant: "red", icon: "🏥", tag: "Urgent" },
  { label: "2 Admins MFA Not Set", variant: "red", icon: "🔒", tag: "Critical" },
  { label: "12 HCP Verifications Pending", variant: "amber", icon: "👨‍⚕️", tag: "Review" },
  { label: "3 Job Posts Pending Approval", variant: "purple", icon: "💼", tag: "Queue" },
  { label: "23 AI Content Flags Review", variant: "blue", icon: "🤖", tag: "AI" },
];
export default function PendingTasks() {
  return (
    <div className="card">
      <div className="card-header border-b border-slate-100 mb-3">
        <h2 className="card-title text-[13px]">⏳ Admin Pending Tasks</h2>
        <span className="badge badge-red text-[9px]">7 items</span>
      </div>
      <div className="space-y-1">
        {tasks.map((t, i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs bg-${t.variant === 'red' ? 'red' : t.variant === 'amber' ? 'amber' : t.variant === 'purple' ? 'purple' : 'blue'}-50 text-${t.variant === 'red' ? 'red' : t.variant === 'amber' ? 'amber' : t.variant === 'purple' ? 'purple' : 'blue'}-600`}>
              {t.icon}
            </div>
            <div className="flex-1 text-[11px] font-bold text-slate-700">{t.label}</div>
            <span className={`badge badge-${t.variant} text-[8px] uppercase tracking-widest`}>{t.tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
