import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
  { name: 'Free', value: 18093, color: '#64748B' },
  { name: 'Starter', value: 9951, color: '#16A34A' },
  { name: 'Pro', value: 12213, color: '#7C3AED' },
  { name: 'Elite', value: 4977, color: '#D97706' },
];

export default function UsersByPlan() {
  return (
    <div className="card">
      <div className="card-header"><h2 className="card-title">👥 Users by Plan</h2><span className="text-ek-green text-xs font-bold cursor-pointer">Manage →</span></div>
      <div className="h-48 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
              {data.map((entry, index) => <Cell key={index} fill={entry.color} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
