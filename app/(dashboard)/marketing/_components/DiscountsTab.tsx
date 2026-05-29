import DataTable, { Column } from "@/components/redesign/DataTable";

export interface DiscountRow {
  code: string;
  desc: string;
  type: string;
  value: string;
  status: string;
  expiry: string;
}

const codes: DiscountRow[] = [
  { code: "HEALTH25", desc: "25% off any plan", type: "% Off", value: "25%", status: "Active", expiry: "Jun 30, 2026" },
  { code: "NHIS10", desc: "₵10 off NHIS users", type: "₵ Off", value: "₵10", status: "Active", expiry: "Dec 31, 2026" },
];

export default function DiscountsTab() {
  const columns: Column<DiscountRow>[] = [
    { key: "code", label: "Promo Code", render: (val) => <span className="font-black text-ek-blue tracking-widest">{val}</span> },
    { key: "desc", label: "Description", render: (val) => <span className="text-[11px] text-slate-500 font-medium">{val}</span> },
    { key: "type", label: "Type", render: (val) => <span className="badge badge-secondary">{val}</span> },
    { key: "value", label: "Discount", render: (val) => <span className="font-black text-slate-700">{val}</span> },
    { key: "status", label: "Status", render: (val) => <span className="badge badge-green">✅ {val}</span> },
    { key: "expiry", label: "Expiry", render: (val) => <span className="text-[10px] font-bold text-slate-400">{val}</span> },
  ];

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input className="flex-1 min-w-[240px] h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none" placeholder="🔍 Search promo codes..." />
        <button className="btn btn-primary btn-sm text-white font-black uppercase tracking-widest text-[9px]">+ Create Code</button>
      </div>
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={codes} selectable />
      </div>
    </div>
  );
}
