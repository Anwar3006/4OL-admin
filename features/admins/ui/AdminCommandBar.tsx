import React from "react";

export default function AdminCommandBar() {
  return (
    <div className="bg-slate-900 rounded-xl p-3 mb-4 flex items-center gap-3 overflow-x-auto no-scrollbar border border-slate-700">
      <div className="text-2xs font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">🔥 SUPER ADMIN</div>
      <div className="flex gap-2">
        <button className="h-7 px-2.5 rounded-lg bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 text-2xs font-extrabold flex items-center gap-1.5 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">🔐 Lock Panel</button>
        <button className="h-7 px-2.5 rounded-lg bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 text-2xs font-extrabold flex items-center gap-1.5 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors">🚫 Suspend Admin</button>
        <button className="h-7 px-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 text-2xs font-extrabold flex items-center gap-1.5 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors">🔒 Force MFA Reset</button>
        <button className="h-7 px-2.5 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 text-2xs font-extrabold flex items-center gap-1.5 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors">🚪 Force Logout All</button>
        <button className="h-7 px-2.5 rounded-lg bg-teal-50 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400 text-2xs font-extrabold flex items-center gap-1.5 hover:bg-teal-100 dark:hover:bg-teal-500/20 transition-colors">🌐 IP Whitelist</button>
        <button className="h-7 px-2.5 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-2xs font-extrabold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">📥 Security Report</button>
        <button className="h-7 px-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-2xs font-extrabold flex items-center gap-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">🤖 AI Audit Trail</button>
      </div>
    </div>
  );
}
