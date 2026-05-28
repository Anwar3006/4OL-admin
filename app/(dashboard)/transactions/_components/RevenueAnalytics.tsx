import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan', revenue: 45000 },
  { name: 'Feb', revenue: 52000 },
  { name: 'Mar', revenue: 48000 },
  { name: 'Apr', revenue: 61000 },
  { name: 'May', revenue: 75000 },
  { name: 'Jun', revenue: 84000 },
];

export default function RevenueAnalytics() {
  return (
    <div className="card h-full">
      <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-4">
        <div>
          <h2 className="card-title text-sm">Revenue Analytics</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Subscriptions · IBP Service Fees · Marketing · Payouts</p>
        </div>
        <select className="h-7 px-2 rounded-lg border border-slate-200 text-[10px] font-bold bg-white outline-none">
          <option>6 months</option>
          <option>1 year</option>
        </select>
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} />
            <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(value) => `₵${value/1000}k`} />
            <Tooltip />
            <Area type="monotone" dataKey="revenue" stroke="#10B981" fillOpacity={1} fill="url(#colorRev)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
