"use client";

import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FinanceVisibilityDialog from "./FinanceVisibilityDialog";
import { formatCurrency } from "@/lib/format";
import {
  useExpenses,
  useSaveExpense,
  useTransactionsOverview,
} from "@/features/transactions/data/useTransactions";

const CATEGORY_LABELS: Record<string, string> = {
  backend_servers: "🖥️ Backend & Servers",
  database: "🗄️ Database",
  otp_sms: "📲 OTP & SMS",
  api_costs: "🔌 API Costs",
  domain_cdn: "🌐 Domain & CDN",
  marketing_ads: "📢 Marketing Ads",
  taxes_levies: "🏛️ Taxes & Levies",
  other: "📦 Other",
};

const BAR_COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#0EA5E9", "#EC4899", "#EF4444", "#64748B"];

export default function ExpensesTab() {
  const { data, isLoading } = useExpenses();
  const saveExpense = useSaveExpense();
  const { data: overview } = useTransactionsOverview();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [category, setCategory] = useState("backend_servers");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const forbidden = Boolean(data?.forbidden);

  // Aggregate the selected month from the ledger-backed expense rows.
  const monthRows = useMemo(
    () => (data?.expenses ?? []).filter((e) => e.month === month),
    [data?.expenses, month],
  );
  const monthTotal = monthRows.reduce((acc, e) => acc + Number(e.amount), 0);
  const revenue = Number(overview?.overview?.kpis?.total_revenue ?? 0);
  const expenseTotal = data?.total ?? 0;
  const netProfit = revenue - expenseTotal;

  const handleAdd = () => {
    const parsed = parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    saveExpense.mutate(
      { month, category, amount: parsed, note: note || undefined },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setAmount("");
          setNote("");
        },
      },
    );
  };

  if (forbidden) {
    return (
      <div className="w-full min-w-0 card mt-4 py-20 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center mx-auto text-2xl">🔒</div>
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-200 tracking-tight">Expenses (SA Only)</h2>
          <p className="text-xs text-slate-500 font-medium">
            Internal platform expenses, hosting costs, P&L and net profit are only visible to Super Admins.
          </p>
          <div className="flex justify-center gap-2">
            <span className="badge badge-amber uppercase tracking-widest">Super Admin Access</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6 mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-2xs font-black uppercase tracking-widest bg-white dark:bg-slate-800 outline-none"
        />
        <button
          onClick={() => setDialogOpen(true)}
          className="h-9 px-4 rounded-xl bg-ek-green text-white text-2xs font-black uppercase tracking-widest hover:opacity-90"
        >
          + Add Expense
        </button>
        <button
          onClick={() => setVisibilityOpen(true)}
          className="h-9 px-4 rounded-xl bg-slate-800 text-white text-2xs font-black uppercase tracking-widest hover:opacity-90"
        >
          🔐 Metric Visibility
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header border-b border-slate-100 dark:border-slate-800 mb-4">
            <h2 className="card-title text-xs">💸 Expense Breakdown — {month}</h2>
          </div>
          {isLoading ? (
            <p className="text-2xs font-bold text-slate-400 uppercase tracking-widest py-6 text-center">Loading…</p>
          ) : monthRows.length === 0 ? (
            <p className="text-2xs font-bold text-slate-400 uppercase tracking-widest py-6 text-center">
              No expenses recorded for {month}.
            </p>
          ) : (
            <div className="space-y-3">
              {monthRows.map((row, i) => {
                const pct = monthTotal > 0 ? Math.round((Number(row.amount) / monthTotal) * 100) : 0;
                return (
                  <div key={row.id}>
                    <div className="flex justify-between text-2xs font-bold mb-1">
                      <span className="text-slate-600 dark:text-slate-300">{CATEGORY_LABELS[row.category] ?? row.category}</span>
                      <span className="text-slate-900 dark:text-slate-100 font-black">{formatCurrency(row.amount)} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-50 dark:bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: BAR_COLORS[i % BAR_COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header border-b border-slate-100 dark:border-slate-800 mb-4">
            <h2 className="card-title text-xs">📊 P&L Summary</h2>
          </div>
          <div className="space-y-2 text-xs font-bold">
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span className="text-slate-500 font-medium">Total Revenue</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-black">{formatCurrency(revenue)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span className="text-slate-500 font-medium">Total Expenses (all months)</span>
              <span className="text-red-500 font-black">{formatCurrency(expenseTotal)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span className="text-slate-500 font-medium">Expenses — {month}</span>
              <span className="text-red-400 font-black">{formatCurrency(monthTotal)}</span>
            </div>
            <div className="flex justify-between pt-2 text-sm font-black">
              <span className="text-slate-800 dark:text-slate-200">Net Profit</span>
              <span className={netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                {formatCurrency(netProfit)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest">
              💸 Add Expense — {month}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs font-bold">
            <div>
              <label className="block text-2xs font-black uppercase tracking-widest text-slate-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-2xs font-black uppercase tracking-widest text-slate-400 mb-1">Amount (₵)</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-2xs font-black uppercase tracking-widest text-slate-400 mb-1">Note (optional)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={saveExpense.isPending}
              className="btn btn-primary w-full text-white font-black uppercase text-2xs tracking-widest disabled:opacity-50"
            >
              {saveExpense.isPending ? "Saving…" : "Save Expense"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <FinanceVisibilityDialog open={visibilityOpen} onOpenChange={setVisibilityOpen} />
    </div>
  );
}
