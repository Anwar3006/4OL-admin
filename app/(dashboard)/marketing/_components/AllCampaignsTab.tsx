import React from "react";
import DataTable, { Column, RowAction } from "@/components/redesign/DataTable";
import { Eye, Pencil, BarChart2, Pause } from "lucide-react";
import { useMarketingProfiles } from "@/hooks/supabase-calls/useMarketingProfiles";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAddMarketingDialog, useViewMarketingDialog } from "@/stores/dialog-store";

export default function AllCampaignsTab() {
  const { data, isLoading } = useMarketingProfiles();
  const campaigns = data || [];
  
  const { open: openView } = useViewMarketingDialog();
  const { open: openEdit } = useAddMarketingDialog();

  const columns: Column<any>[] = [
    { 
      key: "headline", 
      label: "Campaign", 
      render: (val, row) => (
        <div>
          <div className="font-bold text-slate-800">{val}</div>
          <div className="text-[10px] text-slate-400 font-medium">{row.marketingType || "Marketing"}</div>
        </div>
      )
    },
    { key: "marketingType", label: "Type", render: (val) => <span className="badge badge-blue capitalize">{val}</span> },
    { key: "status", label: "Status", render: (val) => <span className={cn("badge", val === 'live' ? 'badge-green' : 'badge-amber')}>{val}</span> },
    { key: "startDate", label: "Start Date", render: (val) => <span className="text-[11px] font-bold text-slate-600">{format(new Date(val), "MMM dd, yyyy")}</span> },
    { key: "endDate", label: "End Date", render: (val) => <span className="text-[11px] font-bold text-slate-600">{format(new Date(val), "MMM dd, yyyy")}</span> },
  ];

  const rowActions: RowAction<any>[] = [
    { label: "View", icon: <Eye className="w-4 h-4" />, onClick: (row) => openView(row.id) },
    { label: "Edit", icon: <Pencil className="w-4 h-4" />, onClick: (row) => openEdit(row) },
  ];

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input className="flex-1 min-w-[240px] h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none" placeholder="🔍 Search campaigns by name, type, target..." />
        <button className="btn btn-secondary btn-sm">📥 Export</button>
      </div>
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={campaigns} selectable rowActions={rowActions} isLoading={isLoading} />
      </div>
    </div>
  );
}
