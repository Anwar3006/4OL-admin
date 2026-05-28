import React from "react";
const actions = [
  { label: "📣 Send Broadcast", variant: "secondary" },
  { label: "👤 Manage Users", variant: "secondary" },
  { label: "🏥 Review Facilities", variant: "secondary" },
  { label: "💳 View Transactions", variant: "secondary" },
  { label: "💼 Review Job Posts", variant: "secondary" },
  { label: "🔐 Force MFA", variant: "danger" },
];
export default function QuickActions() {
  return (
    <div className="card">
      <h2 className="card-title mb-4">⚡ Quick Actions</h2>
      <div className="space-y-2">
        {actions.map((a, i) => (
          <button key={i} className={`btn w-full justify-start btn-${a.variant === 'danger' ? 'danger' : 'secondary'}`}>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
