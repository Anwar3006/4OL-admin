import { DataTable } from "@/components/Data-Table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

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
  const columns = useMemo<ColumnDef<RefundRow>[]>(
    () => [
    { accessorKey: "id", header: "REF ID", cell: ({ row }) => <span className="font-mono text-[10px] text-slate-500 font-bold">{row.original.id}</span> },
    { accessorKey: "date", header: "Date" },
    { accessorKey: "user", header: "User", cell: ({ row }) => <span className="font-black text-slate-800">{row.original.user}</span> },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => <span className="font-black text-amber-600">{row.original.amount}</span> },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <span className="badge badge-amber">↩️ {row.original.status}</span> },
    ],
    [],
  );

  return (
    <div className="w-full min-w-0 space-y-4 mt-4">
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
}
