import DataTable, { Column } from "@/components/redesign/DataTable";

export interface RefundRow {
  id: string;
  date: string;
  user: string;
  type: string;
  amount: string;
  status: string;
}

const data: RefundRow[] = [
  { id: "REF-88120KOP", date: "Today, 09:30", user: "Nana A****", type: "Refund", amount: "₵89.00", status: "Refunded" },
];

export default function RefundsTab() {
  const columns: Column<RefundRow>[] = [
    { key: "id", label: "REF ID", render: (val) => <span className="font-mono text-[10px] text-slate-500 font-bold">{val}</span> },
    { key: "date", label: "Date" },
    { key: "user", label: "User", render: (val) => <span className="font-black text-slate-800">{val}</span> },
    { key: "amount", label: "Amount", render: (val) => <span className="font-black text-amber-600">{val}</span> },
    { key: "status", label: "Status", render: (val) => <span className="badge badge-amber">↩️ {val}</span> },
  ];

  return (
    <div className="space-y-4 mt-4">
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={data} selectable />
      </div>
    </div>
  );
}
