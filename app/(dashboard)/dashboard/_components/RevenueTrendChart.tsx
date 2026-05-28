import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jul', sub: 114, fee: 118 },
  { name: 'Sep', sub: 104, fee: 114 },
  { name: 'Nov', sub: 86, fee: 108 },
  { name: 'Jan', sub: 61, fee: 100 },
  { name: 'Mar', sub: 36, fee: 89 },
  { name: 'May', sub: 15, fee: 80 },
];

export default function RevenueTrendChart() {
  return (
    <div className="card h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="card-title">📈 Revenue Trend</h2>
        <div className="flex gap-2">
            <button className="btn btn-sm btn-secondary">Monthly</button>
            <button className="btn btn-sm btn-primary text-white">Quarterly</button>
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Area type="monotone" dataKey="sub" stroke="#10B981" fill="#D1FAE5" name="Subscriptions" />
            <Area type="monotone" dataKey="fee" stroke="#3B82F6" fill="#DBEAFE" name="Transaction Fees" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
