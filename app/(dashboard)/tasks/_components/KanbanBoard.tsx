import React from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface KanbanTask {
  id: string;
  title: string;
  desc: string;
  pri: string;
  priColor: string;
  user: string;
  cat: string;
  due?: string;
  urgent?: boolean;
  prog?: number;
  done?: string;
}

const columns: { title: string; color: string; count: number; tasks: KanbanTask[] }[] = [
  { 
    title: "New Task", 
    color: "bg-ek-blue", 
    count: 4,
    tasks: [
      { id: "T-004", title: "Patch Firebase FCM token expiry issue", desc: "Push notifications failing for ~340 users", pri: "Critical", priColor: "bg-slate-900 text-white", user: "YD", cat: "🛠 Dev", due: "Today", urgent: true },
      { id: "T-001", title: "Update admin MFA enforcement policy", desc: "Review and enforce MFA for all admin accounts", pri: "High", priColor: "bg-red-100 text-red-700", user: "YD", cat: "🔐 Security", due: "Jun 1", urgent: true },
      { id: "T-002", title: "Export NHIS-linked user report for Q2", desc: "Generate and verify NHIS data export for GH-NHIA compliance report", pri: "Medium", priColor: "bg-yellow-100 text-yellow-700", user: "AO", cat: "📊 Reports", due: "Jun 15" },
      { id: "T-003", title: "Review 12 pending facility registrations", desc: "Facilities pending SA approval since last week", pri: "Low", priColor: "bg-green-100 text-green-700", user: "KA", cat: "🏥 Facilities", due: "May 25" },
    ]
  },
  { 
    title: "In Progress", 
    color: "bg-ek-gold", 
    count: 6, 
    tasks: [
      { id: "T-005", title: "ISO 27001 internal audit preparation", desc: "Compile documentation and security logs for August audit", pri: "High", priColor: "bg-red-100 text-red-700", user: "FM", cat: "🔐 Compliance", due: "Jul 30", prog: 45 },
      { id: "T-006", title: "Migrate 4,200 legacy records to AES-256", desc: "Backend migration of pre-2025 records to new encryption schema", pri: "Medium", priColor: "bg-yellow-100 text-yellow-700", user: "YD", cat: "🛠 Dev", due: "Jun 10", prog: 72 },
    ]
  },
  { 
    title: "Under Review", 
    color: "bg-ek-purple", 
    count: 3, 
    tasks: [
      { id: "T-011", title: "IBP onboarding workflow review — 7 applications", desc: "Validate 7 pending IBP applications and complete KYC checks", pri: "High", priColor: "bg-red-100 text-red-700", user: "FM", cat: "🏢 IBP", due: "May 30" },
      { id: "T-012", title: "GH-DPA deletion request for user 4OL-008821", desc: "Deletion filed May 1 — 23 days remaining per GH-DPA §34", pri: "Medium", priColor: "bg-yellow-100 text-yellow-700", user: "AO", cat: "⚖️ Compliance", due: "Jun 1", urgent: true },
    ]
  },
  { 
    title: "Completed", 
    color: "bg-ek-green", 
    count: 12, 
    tasks: [
      { id: "T-014", title: "Q1 DPA Annual Compliance Report submission", desc: "", pri: "High", priColor: "bg-red-100 text-red-700", user: "AO", cat: "⚖️ Compliance", done: "Apr 2026" },
      { id: "T-016", title: "Platform v2.0 admin panel deployment", desc: "", pri: "Medium", priColor: "bg-yellow-100 text-yellow-700", user: "YD", cat: "🛠 Dev", done: "May 2026" },
    ]
  },
];

export default function KanbanBoard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
      {columns.map((col, i) => (
        <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-[400px]">
          <div className="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", col.color)} />
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">{col.title}</span>
              <span className="badge badge-secondary text-[9px] font-black">{col.count}</span>
            </div>
            <button className="w-6 h-6 rounded-lg bg-slate-50 text-slate-400 hover:text-slate-600 transition-all font-bold">+</button>
          </div>
          <div className="p-2 space-y-3 flex-1">
            {col.tasks.map((t, j) => (
              <div key={j} className={cn("bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group", t.done && "opacity-60")}>
                <div className="flex justify-between items-start mb-2">
                  <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full", t.priColor)}>{t.pri}</span>
                  <span className="text-[9px] font-mono font-bold text-slate-300 group-hover:text-slate-500">{t.id}</span>
                </div>
                <h4 className={cn("text-xs font-bold text-slate-800 leading-snug mb-1", t.done && "line-through text-slate-400")}>{t.title}</h4>
                {t.desc && <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-3">{t.desc}</p>}
                
                {t.prog && (
                    <div className="mb-3 space-y-1">
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-ek-green" style={{ width: `${t.prog}%` }} />
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2 border-t border-slate-50 pt-2.5">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-ek-green to-ek-teal flex items-center justify-center text-[8px] font-black text-white">{t.user}</div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{t.cat}</span>
                  {t.done ? (
                      <span className="ml-auto text-[8px] font-black text-ek-green-dark">✅ {t.done}</span>
                  ) : (
                      <span className={cn("ml-auto text-[9px] font-black", t.urgent ? "text-red-500" : "text-slate-400")}>Due: {t.due}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
