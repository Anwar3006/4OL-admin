import DataTable, { Column } from "@/components/redesign/DataTable";
import KpiCard from "@/components/redesign/KpiCard";

export interface SubscriptionRow {
  id: string;
  user: string;
  plan: string;
  value: string;
  date: string;
  status: string;
}

const subs: SubscriptionRow[] = [
  { id: "SUB-8812", user: "Kofi Owner", plan: "Pro", value: "₵350.00", date: "May 7, 2026", status: "Active" },
  { id: "SUB-8813", user: "Ama Member", plan: "Elite", value: "₵500.00", date: "May 7, 2026", status: "Active" },
];

export default function SubscriptionsTab() {
  const columns: Column<SubscriptionRow>[] = [
    { key: "id", label: "Subscription ID", render: (val) => <span className="font-mono text-[10px] text-slate-500 font-bold">{val}</span> },
    { key: "user", label: "User", render: (val) => <span className="font-black text-slate-800">{val}</span> },
    { key: "plan", label: "Plan", render: (val) => <span className="badge badge-purple">{val}</span> },
    { key: "value", label: "Monthly Value", render: (val) => <span className="font-black text-ek-green-dark">{val}</span> },
    { key: "date", label: "Next Renewal", render: (val) => <span className="text-slate-400 font-medium">{val}</span> },
    { key: "status", label: "Status", render: (val) => <span className="badge badge-green">✅ {val}</span> },
  ];

  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon="✅" label="Renewals (MTD)" value="₵87,400" variant="green" delta="+9.2%" deltaType="up" />
        <KpiCard icon="💸" label="New Subs (MTD)" value="₵48,200" variant="blue" delta="+14.1%" deltaType="up" />
        <KpiCard icon="📊" label="Upgrades (MTD)" value="₵9,840" variant="purple" delta="+6.4%" deltaType="up" />
        <KpiCard icon="📉" label="Churn Rate" value="1.8%" variant="red" delta="-0.2%" deltaType="up" />
      </div>
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={subs} selectable />
      </div>
    </div>
  );
}
