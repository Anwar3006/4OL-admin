import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
  { name: 'MoMo', value: 58, color: '#10B981' },
  { name: 'Card', value: 24, color: '#3B82F6' },
  { name: 'Voda Cash', value: 12, color: '#F59E0B' },
  { name: 'Other', value: 6, color: '#64748B' },
];

export default function PaymentMethods() {
  return (
    <div className="card h-full">
      <h2 className="card-title text-sm mb-4">Payment Methods</h2>
      <div className="h-48 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value">
              {data.map((entry, index) => <Cell key={index} fill={entry.color} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
            <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
            <span>{item.name} ({item.value}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
