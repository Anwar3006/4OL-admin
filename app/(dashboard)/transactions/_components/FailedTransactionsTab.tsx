import DataTable, { Column } from "@/components/redesign/DataTable";

export interface FailedTransactionRow {
  id: string;
  date: string;
  user: string;
  type: string;
  amount: string;
  method: string;
  reason: string;
}

const data: FailedTransactionRow[] = [
  { id: "TXN-7731-M", date: "Today, 10:45", user: "Yaw Mensah", type: "Subscription", amount: "₵150.00", method: "MoMo", reason: "Insufficient Funds" },
  { id: "TXN-6612-L", date: "Yesterday", user: "Kofi Owusu", type: "IBP Fee", amount: "₵350.00", method: "Card", reason: "3DS Auth Failed" },
];

export default function FailedTransactionsTab() {
  const columns: Column<FailedTransactionRow>[] = [
    { key: "id", label: "TXN ID", render: (val) => <span className="font-mono text-[10px] text-slate-500 font-bold">{val}</span> },
    { key: "date", label: "Date" },
    { key: "user", label: "User", render: (val) => <span className="font-black text-slate-800">{val}</span> },
    { key: "type", label: "Type" },
    { key: "amount", label: "Amount", render: (val) => <span className="font-black text-red-500">{val}</span> },
    { key: "reason", label: "Failure Reason", render: (val) => <span className="text-[10px] font-bold text-red-400 uppercase tracking-tighter italic">{val}</span> },
  ];

  return (
    <div className="space-y-4 mt-4 text-xs">
      <div className="alert bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center gap-2">
        <span>⚠️</span>
        <strong>12 failed transactions</strong> detected in the last 24 hours.
      </div>
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={data} selectable />
      </div>
    </div>
  );
}
