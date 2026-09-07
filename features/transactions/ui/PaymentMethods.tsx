"use client";

import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useTransactionsOverview } from "@/features/transactions/data/useTransactions";

const METHOD_COLORS: Record<string, string> = {
  mtn_momo: "#10B981",
  vodafone_cash: "#F59E0B",
  airteltigo: "#8B5CF6",
  paystack_card: "#3B82F6",
  card: "#3B82F6",
  bank_transfer: "#0EA5E9",
  manual: "#64748B",
  promo: "#EC4899",
};
const FALLBACK_COLOR = "#64748B";

const prettify = (method: string) =>
  method
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export default function PaymentMethods() {
  const { data } = useTransactionsOverview();
  const hidden = Boolean(data?.overview?.payment_methods_hidden);

  const chartData = useMemo(() => {
    const methods = data?.overview?.payment_methods ?? {};
    const total = Object.values(methods).reduce((acc, value) => acc + Number(value ?? 0), 0);
    if (total <= 0) return [];
    return Object.entries(methods).map(([method, amount]) => ({
      name: prettify(method),
      value: Math.round((Number(amount) / total) * 100),
      color: METHOD_COLORS[method] ?? FALLBACK_COLOR,
    }));
  }, [data?.overview?.payment_methods]);

  return (
    <div className="card h-full">
      <h2 className="card-title text-sm mb-4">Payment Methods</h2>
      {hidden ? (
        <div className="h-48 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl mb-2">🔒</div>
            <p className="text-2xs font-black uppercase tracking-widest text-slate-400">Hidden by Super Admin</p>
          </div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center">
          <p className="text-2xs font-bold uppercase tracking-widest text-slate-300">No payments recorded yet</p>
        </div>
      ) : (
        <>
          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value">
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {chartData.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-2xs font-bold text-slate-500">
                <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                <span>{item.name} ({item.value}%)</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
