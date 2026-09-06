"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface AdminSecurityRow {
  user_id: string;
  name: string;
  mfa_enabled: boolean;
  whitelisted_ips: string[] | null;
}

interface ActiveSessionRow {
  id: string;
  admin_name: string;
  device_info: string | null;
  user_agent: string | null;
  ip_address: string | null;
  started_at: string;
}

export default function SecurityCenterTab() {
  const { data, isLoading } = useQuery<{ admins: AdminSecurityRow[]; sessions: ActiveSessionRow[] }, Error>({
    queryKey: ["admin-security-center"],
    queryFn: async () => {
      const res = await fetch("/api/admin/security-overview", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load security overview.");
      return res.json();
    },
  });

  const admins = data?.admins ?? [];
  const mfaOnCount = admins.filter((a) => a.mfa_enabled).length;
  const mfaCompliance = admins.length > 0 ? Math.round((mfaOnCount / admins.length) * 100) : 0;
  const allIps = Array.from(new Set(admins.flatMap((a) => a.whitelisted_ips ?? [])));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card">
        <h2 className="card-title mb-6">🔐 MFA Compliance</h2>
        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-100 mb-6">
          <div className="text-3xl font-black text-ek-gold">{isLoading ? "…" : `${mfaCompliance}%`}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {mfaOnCount} of {admins.length} admins have MFA enabled
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-bold text-center">
            No admin MFA enrollment flow exists yet in this app — this reflects the
            real (currently unused) <code>mfa_enabled</code> column, not a computed score.
          </p>
        </div>
        <div>
          <div className="flex justify-between text-[11px] font-black text-slate-500 mb-1 uppercase tracking-tighter">
            <span>MFA Compliance</span><b>{mfaCompliance}%</b>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-ek-gold" style={{ width: `${mfaCompliance}%` }} />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title">🔑 MFA Status</h2>
          </div>
          <div className="space-y-2">
            {isLoading && <div className="text-xs text-slate-400 py-4 text-center">Loading…</div>}
            {!isLoading && admins.length === 0 && (
              <div className="text-xs text-slate-400 py-4 text-center">No admins found.</div>
            )}
            {admins.map((admin) => (
              <div key={admin.user_id} className={cn("p-2 rounded-lg flex justify-between items-center text-xs font-bold transition-all", admin.mfa_enabled ? "bg-ek-green/5 text-ek-green-dark" : "bg-red-50 text-red-600")}>
                <span className="flex items-center gap-2">
                  <div className={cn("w-1.5 h-1.5 rounded-full", admin.mfa_enabled ? "bg-ek-green-dark" : "bg-red-500")} />
                  {admin.name}
                </span>
                <span className="uppercase text-[9px] tracking-widest">{admin.mfa_enabled ? "✅ Active" : "❌ Off"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4"><h2 className="card-title">🌐 IP Whitelist</h2></div>
          <div className="space-y-2">
            {allIps.length === 0 && (
              <div className="text-xs text-slate-400 py-4 text-center">No whitelisted IPs configured for any admin.</div>
            )}
            {allIps.map((ip) => (
              <div key={ip} className="p-2 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center text-xs">
                <span className="font-mono font-bold text-slate-700">{ip}</span>
                <span className="badge badge-green text-[9px]">Active</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="card-title mb-4">💻 Active Sessions</h2>
          <div className="space-y-2">
            {(data?.sessions ?? []).length === 0 && (
              <div className="text-xs text-slate-400 py-4 text-center">No active admin sessions right now.</div>
            )}
            {(data?.sessions ?? []).map((session) => (
              <div key={session.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex gap-3 text-xs items-center">
                <div className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-lg">🖥️</div>
                <div className="flex-1">
                  <div className="font-bold text-slate-800">{session.admin_name}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                    {session.ip_address || "Unknown IP"} · since {new Date(session.started_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
