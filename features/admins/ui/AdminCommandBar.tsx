import React from "react";

export default function AdminCommandBar() {
  return (
    <div className="bg-slate-900 rounded-xl p-3 mb-4 flex items-center gap-3 overflow-x-auto no-scrollbar border border-slate-700">
      <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">🔥 SUPER ADMIN</div>
      <div className="flex gap-2">
        <button className="h-7 px-2.5 rounded-lg bg-red-50 text-red-600 text-[10px] font-extrabold flex items-center gap-1.5 hover:bg-red-100 transition-colors">🔐 Lock Panel</button>
        <button className="h-7 px-2.5 rounded-lg bg-purple-50 text-purple-600 text-[10px] font-extrabold flex items-center gap-1.5 hover:bg-purple-100 transition-colors">🚫 Suspend Admin</button>
        <button className="h-7 px-2.5 rounded-lg bg-amber-50 text-amber-600 text-[10px] font-extrabold flex items-center gap-1.5 hover:bg-amber-100 transition-colors">🔒 Force MFA Reset</button>
        <button className="h-7 px-2.5 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-extrabold flex items-center gap-1.5 hover:bg-blue-100 transition-colors">🚪 Force Logout All</button>
        <button className="h-7 px-2.5 rounded-lg bg-teal-50 text-teal-600 text-[10px] font-extrabold flex items-center gap-1.5 hover:bg-teal-100 transition-colors">🌐 IP Whitelist</button>
        <button className="h-7 px-2.5 rounded-lg bg-white text-slate-800 text-[10px] font-extrabold border border-slate-200 flex items-center gap-1.5 hover:bg-slate-50 transition-colors">📥 Security Report</button>
        <button className="h-7 px-2.5 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-extrabold flex items-center gap-1.5 hover:bg-indigo-100 transition-colors">🤖 AI Audit Trail</button>
      </div>
    </div>
  );
}
