import React from "react";

const logs = [
  { time: "2026-05-07 09:14:32", admin: "Francis N. Mensah", action: "🔐 Login", module: "Auth", ip: "196.168.1.1", severity: "LOW" },
  { time: "2026-05-07 09:02:11", admin: "Anwar Sadat", action: "✏️ User Edit", module: "Users", ip: "105.112.5.20", severity: "MEDIUM" },
  { time: "2026-05-07 08:55:08", admin: "Developer Registrar", action: "⚙️ Config Change", module: "Settings", ip: "103.21.4.8", severity: "HIGH" },
];

export default function ActivityLogsTab() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input className="flex-1 min-w-[200px] h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none" placeholder="🔍 Search logs..." />
        <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"><option>All Admins</option></select>
        <button className="btn btn-secondary btn-sm">📥 Export</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Module</th>
                <th>IP Address</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={i}>
                  <td className="font-mono text-[10px] text-slate-400">{log.time}</td>
                  <td><span className="badge badge-secondary">{log.admin}</span></td>
                  <td className="font-bold text-slate-700">{log.action}</td>
                  <td><span className="text-[10px] font-bold text-slate-500 uppercase">{log.module}</span></td>
                  <td className="font-mono text-[10px]">{log.ip}</td>
                  <td><span className={`badge font-extrabold ${log.severity === 'LOW' ? 'badge-green' : log.severity === 'MEDIUM' ? 'badge-amber' : 'badge-red'}`}>{log.severity}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
