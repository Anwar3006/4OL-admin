import DataTable, { Column } from "@/components/redesign/DataTable";

export interface MarketingSubRow {
  user: string;
  plan: string;
  price: string;
  status: string;
  renewal: string;
}

const subs: MarketingSubRow[] = [
  { user: "Ama A****", plan: "Elite", price: "₵89.00", status: "Active", renewal: "Jun 12, 2026" },
  { user: "Kofi B****", plan: "Pro", price: "₵45.00", status: "Active", renewal: "Jun 10, 2026" },
];

export default function SubscriptionsTab() {
  const columns: Column<MarketingSubRow>[] = [
    { key: "user", label: "User", render: (val) => <span className="font-bold text-slate-800">{val}</span> },
    { key: "plan", label: "Plan", render: (val) => <span className="badge badge-purple">{val}</span> },
    { key: "price", label: "Monthly Price", render: (val) => <span className="font-black">{val}</span> },
    { key: "status", label: "Status", render: (val) => <span className="badge badge-green">✅ {val}</span> },
    { key: "renewal", label: "Next Renewal", render: (val) => <span className="text-[10px] font-bold text-slate-400">{val}</span> },
  ];

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input className="flex-1 min-w-[240px] h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none" placeholder="🔍 Search subscribers..." />
        <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"><option>All Plans</option></select>
        <button className="btn btn-secondary btn-sm">📥 Export List</button>
      </div>
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={subs} selectable />
      </div>
    </div>
  );
}
