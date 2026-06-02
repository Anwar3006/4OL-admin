import React from "react";
import { MoreHorizontal, Pencil, Eye, LayoutPanelLeft, Activity, Trash2, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useUsers } from "@/hooks/supabase-calls/useUser";
import { format } from "date-fns";

export default function AllAdminsTab() {
  const { data, isLoading } = useUsers({ admin: true });
  const admins = data?.users || [];

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
                <th>Joined</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-4">Loading admins...</td>
                </tr>
              ) : (
                admins.map((adm, i) => (
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
                      <span className={`badge ${adm.role === 'super_admin' ? 'badge-red' : adm.role === 'admin' ? 'badge-purple' : 'bg-slate-100 text-slate-600'}`}>
                        {adm.role}
                      </span>
                    </td>
                    <td>
                      <span className={`text-[10px] font-extrabold ${(adm as any).mfa_enabled ? 'text-ek-green-dark' : 'text-red-500'}`}>
                        {(adm as any).mfa_enabled ? '✅ ON' : '❌ OFF'}
                      </span>
                    </td>
                    <td className="font-mono text-[10px]">{(adm as any).whitelisted_ips?.join(', ') || 'N/A'}</td>
                    <td className="text-[10px] text-slate-500">{format(new Date(adm.created_at), "MMM dd, yyyy")}</td>
                    <td><span className={`badge ${adm.status === 'active' ? 'badge-green' : 'badge-secondary'}`}>{adm.status}</span></td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"><Eye className="w-4 h-4" /></button>
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-ek-blue transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-ek-red transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
