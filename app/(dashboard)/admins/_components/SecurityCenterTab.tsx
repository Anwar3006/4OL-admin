import React from "react";
import { cn } from "@/lib/utils";

export default function SecurityCenterTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card">
        <h2 className="card-title mb-6">🔐 Admin Security Score</h2>
        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-100 mb-6">
          <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-[10px] border-ek-gold border-t-slate-200 -rotate-45">
            <div className="rotate-45 text-center">
              <div className="text-3xl font-black text-ek-gold">82</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">/ 100</div>
            </div>
          </div>
          <div className="mt-4 text-sm font-black text-ek-gold uppercase tracking-widest">Moderate Risk</div>
          <p className="text-[10px] text-slate-400 mt-1 font-bold">Enable MFA on all accounts for 95+</p>
        </div>
        <div className="space-y-3">
          {["MFA Compliance", "Sessions Safety", "IP Whitelist Coverage", "Password Strength"].map((m, i) => (
            <div key={i}>
              <div className="flex justify-between text-[11px] font-black text-slate-500 mb-1 uppercase tracking-tighter"><span>{m}</span><b>{i === 1 ? '100%' : '82%'}</b></div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-ek-gold" style={{ width: i === 1 ? '100%' : '82%' }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title">🔑 MFA Status</h2>
            <button className="btn btn-secondary btn-sm bg-amber-50 text-amber-600 border-none font-black uppercase text-[9px] tracking-widest hover:bg-amber-100 transition-all">Force All MFA</button>
          </div>
          <div className="space-y-2">
            {[
              { name: "Francis N. Mensah", status: "Active", active: true },
              { name: "Anwar Sadat Mamudu", status: "Off", active: false },
              { name: "Developer Registrar", status: "Active", active: true },
              { name: "4 Our Life Admin", status: "Off", active: false },
              { name: "Abena Mensah", status: "Active", active: true },
              { name: "Kofi Asante", status: "Active", active: true },
            ].map((user, i) => (
              <div key={i} className={cn("p-2 rounded-lg flex justify-between items-center text-xs font-bold transition-all", user.active ? "bg-ek-green/5 text-ek-green-dark" : "bg-red-50 text-red-600")}>
                <span className="flex items-center gap-2">
                  <div className={cn("w-1.5 h-1.5 rounded-full", user.active ? "bg-ek-green-dark" : "bg-red-500")} />
                  {user.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="uppercase text-[9px] tracking-widest">{user.active ? '✅ Active' : '❌ Off'}</span>
                  {!user.active && <button className="h-6 px-2 rounded-md bg-white border border-red-100 text-red-600 text-[9px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">Enable</button>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4"><h2 className="card-title">🌐 IP Whitelist</h2><button className="btn btn-primary btn-sm text-white">+ Add IP</button></div>
          <div className="space-y-2">
            {["196.168.1.0/24", "105.112.0.0/16", "103.21.4.8"].map((ip, i) => (
              <div key={i} className="p-2 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center text-xs">
                <span className="font-mono font-bold text-slate-700">{ip}</span>
                <span className="badge badge-green text-[9px]">Active</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2 className="card-title mb-4">💻 Active Sessions</h2>
          <div className="space-y-2">
            {["Francis N. Mensah", "Anwar Sadat Mamudu"].map((name, i) => (
              <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex gap-3 text-xs items-center">
                <div className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-lg">{i === 0 ? '🖥️' : '📱'}</div>
                <div className="flex-1">
                  <div className="font-bold text-slate-800">{name}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Chrome · Windows · 196.168.1.1</div>
                </div>
                <button className="btn btn-secondary btn-sm bg-white hover:bg-red-50 hover:text-red-500 border-none transition-all">End</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
