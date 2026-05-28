import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const roles = [
  { name: "Super Admin", color: "text-red-600", bg: "bg-red-50", border: "border-red-100", count: 1, permissions: ["Full system access", "Create/delete admins", "Financial data access", "Security & AI control"] },
  { name: "Admin Manager", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100", count: 1, permissions: ["Invite new admins", "Edit admin profiles", "View activity logs", "Suspend admins (not SA)"] },
  { name: "Content Manager", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", count: 1, permissions: ["Diseases & Conditions", "Human Anatomy", "Symptoms", "FAQ"] },
  { name: "Facilities Manager", color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-100", count: 1, permissions: ["Facility CRUD", "Verify facilities", "Map management"] },
];

const modules = [
  { name: "Admin Management", permissions: ["✓", "✓", "—", "—", "—", "—", "—", "R/O", "—"] },
  { name: "User Management", permissions: ["✓", "✓", "—", "—", "✓", "—", "—", "R/O", "—"] },
  { name: "Facilities", permissions: ["✓", "R/O", "—", "✓", "R/O", "—", "—", "R/O", "—"] },
  { name: "Health Content", permissions: ["✓", "—", "✓", "—", "R/O", "—", "—", "R/O", "R/O"] },
  { name: "Transactions", permissions: ["✓", "—", "—", "—", "—", "—", "✓", "R/O", "—"] },
  { name: "Marketing", permissions: ["✓", "—", "—", "—", "—", "✓", "R/O", "R/O", "—"] },
  { name: "Chats", permissions: ["✓", "R/O", "—", "—", "✓", "—", "—", "R/O", "—"] },
  { name: "Reviews & Ratings", permissions: ["✓", "—", "✓", "✓", "✓", "R/O", "—", "R/O", "—"] },
  { name: "AI Hub", permissions: ["✓", "—", "—", "—", "—", "—", "—", "✓", "✓"] },
];

const headers = ["Module / Permission", "SA", "Adm Mgr", "Content", "Fac Mgr", "Support", "Mktg", "Finance", "Dev", "AI Mgr"];

export default function RolesPermissionsTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {roles.map((role, i) => (
          <div key={i} className={cn("card border shadow-sm", role.border, role.bg)}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className={cn("font-black text-[12px] uppercase tracking-tight", role.color)}>👑 {role.name}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{role.count} account</div>
              </div>
              <span className="badge badge-secondary text-[10px] font-black">{role.count}</span>
            </div>
            <div className="space-y-1.5">
              {role.permissions.map((p, j) => (
                <div key={j} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                  <div className="w-3.5 h-3.5 rounded-sm bg-ek-green flex items-center justify-center text-white"><Check className="w-2.5 h-2.5" /></div>
                  {p}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="card-header border-b border-slate-100 flex justify-between items-center">
            <h2 className="card-title text-[13px]">📊 Full Permission Matrix</h2>
            <div className="flex gap-2">
                <button className="btn btn-secondary btn-sm font-bold text-[10px]">✏️ Edit</button>
                <button className="btn btn-secondary btn-sm font-bold text-[10px]">📥 Export</button>
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] font-bold text-slate-600 border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-widest text-[9px]">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className={cn("p-3 font-black", i === 0 ? "text-left min-w-[160px]" : "text-center")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {modules.map((m, i) => (
                <tr key={i} className={cn(i % 2 === 0 ? "bg-slate-50/30" : "bg-white")}>
                  <td className="p-3 text-slate-900 font-black">{m.name}</td>
                  {m.permissions.map((p, j) => (
                    <td key={j} className={cn(
                        "p-3 text-center",
                        p === "✓" ? "text-ek-green-dark text-lg font-black" : 
                        p === "R/O" ? "text-ek-blue text-[10px]" : "text-slate-200"
                    )}>
                        {p}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
