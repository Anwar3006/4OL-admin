import React from "react";

/**
 * Gap Analysis Part M (M7): Page Linkages — static integration status
 * cards. Delivery providers are not wired yet (Phase 5 interconnections),
 * so statuses render as pending/beta until the Notifications module
 * campaign infrastructure carries these channels.
 */

const INTEGRATIONS = [
  { icon: "🔔", name: "Push Notifications", detail: "Via Notifications module campaigns", status: "Available", tone: "green" },
  { icon: "💬", name: "Twilio SMS", detail: "Provider credentials not configured", status: "Not Connected", tone: "amber" },
  { icon: "📧", name: "SendGrid Email", detail: "Provider credentials not configured", status: "Not Connected", tone: "amber" },
  { icon: "🏃", name: "HealthMiles", detail: "Fitness campaign cross-link", status: "Planned", tone: "slate" },
  { icon: "🏪", name: "Business Ad Portal", detail: "IBP businesses submit ads for review", status: "Beta", tone: "blue" },
];

const LINKED_PAGES = [
  { page: "Home Feed", note: "In-App Banner slot" },
  { page: "IBP Marketplace", note: "Business Submitted campaigns" },
  { page: "Fitness Module", note: "fitness_ai_campaigns delivery path" },
  { page: "Period Tracker", note: "m-period-campaign delivery path" },
];

const TONE: Record<string, string> = {
  green: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/30",
  amber: "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/30",
  slate: "bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700",
  blue: "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-500/30",
};

export default function LinkagesTab() {
  return (
    <div className="w-full min-w-0 grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <h3 className="section-heading mb-4">
          Marketing Integrations
        </h3>
        <div className="space-y-3">
          {INTEGRATIONS.map((integration) => (
            <div
              key={integration.name}
              className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl">{integration.icon}</span>
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-700 dark:text-slate-300 truncate">
                    {integration.name}
                  </div>
                  <div className="text-2xs font-medium text-slate-400 truncate">
                    {integration.detail}
                  </div>
                </div>
              </div>
              <span
                className={`shrink-0 ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-black uppercase tracking-widest border ${TONE[integration.tone]}`}
              >
                {integration.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <h3 className="section-heading mb-4">
          App Pages Linked to Campaigns
        </h3>
        <div className="space-y-3">
          {LINKED_PAGES.map((link) => (
            <div
              key={link.page}
              className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 px-4 py-3"
            >
              <div className="text-xs font-black text-slate-700 dark:text-slate-300">{link.page}</div>
              <div className="text-2xs font-bold uppercase tracking-widest text-slate-400">
                {link.note}
              </div>
            </div>
          ))}
        </div>
        <p className="text-2xs text-slate-400 font-medium mt-4">
          Campaign links are stored in the campaign&apos;s links payload; deep-page
          targeting rides the Notifications interconnection once channels are wired.
        </p>
      </div>
    </div>
  );
}
