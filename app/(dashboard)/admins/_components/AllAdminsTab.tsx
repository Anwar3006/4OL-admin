import React from "react";
import { MoreHorizontal, Pencil, Eye, LayoutPanelLeft, Activity, Trash2, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const admins = [
  { 
    name: "Francis Neizer Mensah", email: "fnm@neizerholdings.com", phone: "+233 20 464 8483", 
    role: "Super Admin", roleVariant: "sa", mfa: true, ip: "196.168.1.1", online: true, 
    joined: "Mar 17, 2026", active: "Just now", status: "Active" 
  },
  { 
    name: "Anwar Sadat Mamudu", email: "anwarsadat.02@gmail.com", phone: "+233 54 333 9109", 
    role: "Admin Manager", roleVariant: "am", mfa: false, ip: "105.112.5.20", online: true, 
    joined: "Mar 17, 2026", active: "5 min ago", status: "Active" 
  },
  { 
    name: "Developer Registrar", email: "developer@neizerholdings.com", phone: "N/A", 
    role: "Developer", roleVariant: "dev", mfa: true, ip: "103.21.4.8", online: true, 
    joined: "Feb 4, 2025", active: "2 min ago", status: "Active" 
  },
];

export default function AllAdminsTab() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input className="flex-1 min-w-[200px] h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none" placeholder="🔍 Search admins by name, email, role..." />
        <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"><option>All Roles</option></select>
        <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"><option>All Status</option></select>
        <button className="btn btn-secondary btn-sm">📥 Export CSV</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10"><input type="checkbox" /></th>
                <th>Admin</th>
                <th>Role</th>
                <th>MFA</th>
                <th>IP Address</th>
                <th>Session</th>
                <th>Joined</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((adm, i) => (
                <tr key={i}>
                  <td><input type="checkbox" /></td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs">
                        {adm.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{adm.name}</div>
                        <div className="text-[10px] text-slate-400">{adm.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${adm.roleVariant === 'sa' ? 'badge-red' : adm.roleVariant === 'am' ? 'badge-purple' : 'bg-slate-100 text-slate-600'}`}>
                      {adm.role}
                    </span>
                  </td>
                  <td>
                    <span className={`text-[10px] font-extrabold ${adm.mfa ? 'text-ek-green-dark' : 'text-red-500'}`}>
                      {adm.mfa ? '✅ ON' : '❌ OFF'}
                    </span>
                  </td>
                  <td className="font-mono text-[10px]">{adm.ip}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${adm.online ? 'bg-ek-green' : 'bg-slate-300'}`} />
                      <span className="text-[10px] font-medium text-slate-500">{adm.online ? 'Online' : 'Offline'}</span>
                    </div>
                  </td>
                  <td className="text-[10px] text-slate-500">{adm.joined}</td>
                  <td><span className="badge badge-green">Active</span></td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"><Eye className="w-4 h-4" /></button>
                      <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-ek-blue transition-colors"><Pencil className="w-4 h-4" /></button>
                      <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-ek-red transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
