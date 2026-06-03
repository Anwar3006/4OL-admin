import DataTable, { Column, RowAction } from "@/components/redesign/DataTable";
import { useMarketingDiscounts } from "@/hooks/supabase-calls/useMarketingDiscounts";
import { format } from "date-fns";
import { Eye, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DiscountsTab() {
  const { data, isLoading } = useMarketingDiscounts();
  const codes = data || [];

  const columns: Column<any>[] = [
    { key: "code", label: "Promo Code", render: (val) => <span className="font-black text-ek-blue tracking-widest">{val}</span> },
    { key: "name", label: "Description", render: (val) => <span className="text-[11px] text-slate-500 font-medium">{val}</span> },
    { key: "discount_type", label: "Type", render: (val) => <span className="badge badge-secondary capitalize">{val}</span> },
    { key: "discount_value", label: "Discount", render: (val) => <span className="font-black text-slate-700">{val}</span> },
    { key: "is_active", label: "Status", render: (val) => <span className={cn("badge", val ? 'badge-green' : 'badge-red')}>✅ {val ? 'Active' : 'Inactive'}</span> },
    { key: "valid_until", label: "Expiry", render: (val) => <span className="text-[10px] font-bold text-slate-400">{format(new Date(val), "MMM dd, yyyy")}</span> },
  ];

  const rowActions: RowAction<any>[] = [
    { label: "View", icon: <Eye className="w-4 h-4" />, onClick: (row) => console.log('View', row.id) },
    { label: "Edit", icon: <Pencil className="w-4 h-4" />, onClick: (row) => console.log('Edit', row.id) },
  ];

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input className="flex-1 min-w-[240px] h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none" placeholder="🔍 Search promo codes..." />
        <button className="btn btn-primary btn-sm text-white font-black uppercase tracking-widest text-[9px]">+ Create Code</button>
      </div>
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={codes} selectable rowActions={rowActions} isLoading={isLoading} />
      </div>
    </div>
  );
}
