"use client";

import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTransactionsOverview } from "@/features/transactions/data/useTransactions";
import { CEDI } from "@/lib/format";

export default function RevenueAnalytics() {
  const { data } = useTransactionsOverview();
  const hidden = Boolean(data?.overview?.monthly_hidden);
  const monthly = data?.overview?.monthly ?? [];

  return (
    <div className="card h-full">
      <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-4">
        <div>
          <h2 className="card-title text-sm">Revenue Analytics</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Subscriptions · IBP Service Fees · Marketing · Payouts</p>
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last 6 months</span>
      </div>
      {hidden ? (
        <div className="h-48 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl mb-2">🔒</div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hidden by Super Admin</p>
          </div>
        </div>
      ) : monthly.length === 0 ? (
        <div className="h-48 flex items-center justify-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">No revenue recorded yet</p>
        </div>
      ) : (
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="month" stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} />
              <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(value) => `${CEDI}${Math.round(Number(value) / 1000)}k`} />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#10B981" fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
