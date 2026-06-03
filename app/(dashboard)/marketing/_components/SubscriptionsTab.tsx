import DataTable, { Column, RowAction } from "@/components/redesign/DataTable";
import { useMarketingSubscriptions } from "@/hooks/supabase-calls/useMarketingSubscriptions";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Eye } from "lucide-react";

export default function SubscriptionsTab() {
  const { data, isLoading } = useMarketingSubscriptions();
  const subs = data || [];

  const columns: Column<any>[] = [
    { key: "name", label: "User", render: (val) => <span className="font-bold text-slate-800">{val}</span> },
    { key: "tier_type", label: "Plan", render: (val) => <span className="badge badge-purple">{val}</span> },
    { key: "price", label: "Monthly Price", render: (val) => <span className="font-black">₵{val}</span> },
    { key: "payment_status", label: "Status", render: (val) => <span className={cn("badge", val === 'active' ? 'badge-green' : 'badge-amber')}>{val}</span> },
    { key: "created_at", label: "Signed Up", render: (val) => <span className="text-[10px] font-bold text-slate-400">{format(new Date(val), "MMM dd, yyyy")}</span> },
  ];

  const rowActions: RowAction<any>[] = [
    { label: "View", icon: <Eye className="w-4 h-4" />, onClick: (row) => console.log('View', row.id) },
  ];

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input className="flex-1 min-w-[240px] h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none" placeholder="🔍 Search subscribers..." />
        <button className="btn btn-secondary btn-sm">📥 Export List</button>
      </div>
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={subs} selectable rowActions={rowActions} isLoading={isLoading} />
      </div>
    </div>
  );
}
