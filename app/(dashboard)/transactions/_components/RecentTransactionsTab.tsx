import DataTable, { Column } from "@/components/redesign/DataTable";

export interface RecentTransactionRow {
  id: string;
  date: string;
  user: string;
  type: string;
  amount: string;
  method: string;
  status: string;
}

const transactions: RecentTransactionRow[] = [
  { id: "TXN-9021-X", date: "Today, 14:32", user: "Kofi Arhin", type: "Subscription", amount: "₵150.00", method: "MoMo", status: "Success" },
  { id: "TXN-8842-B", date: "Today, 12:10", user: "Ama Boateng", type: "IBP Fee", amount: "₵350.00", method: "Card", status: "Success" },
  { id: "TXN-7731-M", date: "Today, 10:45", user: "Yaw Mensah", type: "Subscription", amount: "₵150.00", method: "MoMo", status: "Failed" },
];

export default function RecentTransactionsTab() {
  const columns: Column<RecentTransactionRow>[] = [
    { 
      key: "id", 
      label: "TXN ID", 
      render: (val) => <span className="font-mono text-[10px] font-black text-slate-500 tracking-tighter">{val}</span> 
    },
    { key: "date", label: "Timestamp", render: (val) => <span className="text-[10px] font-bold text-slate-400">{val}</span> },
    { key: "user", label: "User", render: (val) => <span className="font-black text-slate-800">{val}</span> },
    { key: "type", label: "Type", render: (val) => <span className="badge badge-secondary">{val}</span> },
    { key: "amount", label: "Amount", render: (val) => <span className="font-black text-slate-900">{val}</span> },
    { key: "method", label: "Method", render: (val) => <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase">{val}</span> },
    { 
      key: "status", 
      label: "Status", 
      render: (val) => (
        <span className={`badge ${val === 'Success' ? 'badge-green' : 'badge-red'}`}>
          {val === 'Success' ? '✅ Success' : '❌ Failed'}
        </span>
      )
    },
  ];

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input className="flex-1 min-w-[240px] h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none" placeholder="🔍 Search transactions by ID, user, method..." />
        <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"><option>All Status</option></select>
        <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"><option>All Types</option></select>
        <button className="btn btn-secondary btn-sm">📥 Export</button>
      </div>
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={transactions} selectable />
      </div>
    </div>
  );
}
