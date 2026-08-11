import React from "react";

export default function ExpensesTab() {
  return (
    <div className="w-full min-w-0 card mt-4 py-20 text-center">
      <div className="max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto text-2xl">💸</div>
        <h2 className="text-lg font-black text-slate-800 tracking-tight">Expenses (SA Only)</h2>
        <p className="text-xs text-slate-500 font-medium">Internal platform expenses, hosting costs, and API usage billing are tracked here for Super Admins.</p>
        <div className="flex justify-center gap-2"><span className="badge badge-amber uppercase tracking-widest">Super Admin Access</span></div>
      </div>
    </div>
  );
}
