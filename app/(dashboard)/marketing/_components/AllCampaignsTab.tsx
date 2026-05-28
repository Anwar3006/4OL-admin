import React from "react";
import DataTable, { Column, RowAction } from "@/components/redesign/DataTable";
import { Eye, Pencil, BarChart2, Pause } from "lucide-react";

export interface CampaignRow {
  name: string;
  sub: string;
  type: string;
  typeVariant: string;
  status: string;
  statusVariant: string;
  target: string;
  impressions: string;
  clicks: string;
  ctr: string;
  budget: string;
  period: string;
}

const campaigns: CampaignRow[] = [
  { name: "🚀 4OL Premium Launch", sub: "Premium subscription drive · Q2 2026", type: "Feature Launch", typeVariant: "blue", status: "Live", statusVariant: "green", target: "All Free Users", impressions: "42,300", clicks: "3,420", ctr: "8.1%", budget: "₵4,500", period: "May 1–31, 2026" },
  { name: "🇬🇭 Ghana Health Month", sub: "Seasonal health awareness campaign", type: "Seasonal", typeVariant: "orange", status: "Live", statusVariant: "green", target: "All Users", impressions: "28,120", clicks: "1,840", ctr: "6.5%", budget: "₵2,800", period: "May 1–31, 2026" },
];

export default function AllCampaignsTab() {
  const columns: Column<CampaignRow>[] = [
    { 
      key: "campaign", 
      label: "Campaign", 
      render: (_, row) => (
        <div>
          <div className="font-bold text-slate-800">{row.name}</div>
          <div className="text-[10px] text-slate-400 font-medium">{row.sub}</div>
        </div>
      )
    },
    { key: "type", label: "Type", render: (val, row) => <span className={`badge badge-${row.typeVariant}`}>{val}</span> },
    { key: "status", label: "Status", render: (val, row) => <span className={`badge badge-${row.statusVariant}`}>🟢 {val}</span> },
    { key: "target", label: "Target", render: (val) => <span className="text-[11px] font-bold text-slate-600">{val}</span> },
    { key: "impressions", label: "Impressions", render: (val) => <span className="font-black text-slate-700">{val}</span> },
    { key: "clicks", label: "Clicks", render: (val) => <span className="font-black text-slate-700">{val}</span> },
    { key: "ctr", label: "CTR", render: (val) => <span className="font-black text-ek-green-dark">{val}</span> },
    { key: "budget", label: "Budget", render: (val) => <span className="text-[11px] font-black text-slate-600">{val}</span> },
    { key: "period", label: "Period", render: (val) => <span className="text-[10px] font-bold text-slate-400">{val}</span> },
  ];

  const rowActions: RowAction<CampaignRow>[] = [
    { label: "View", icon: <Eye className="w-4 h-4" />, onClick: () => {} },
    { label: "Edit", icon: <Pencil className="w-4 h-4" />, onClick: () => {} },
    { label: "Analytics", icon: <BarChart2 className="w-4 h-4" />, onClick: () => {} },
    { label: "Pause", icon: <Pause className="w-4 h-4" />, onClick: () => {} },
  ];

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input className="flex-1 min-w-[240px] h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none" placeholder="🔍 Search campaigns by name, type, target..." />
        <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"><option>All Status</option></select>
        <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"><option>All Types</option></select>
        <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"><option>All Channels</option></select>
        <button className="btn btn-secondary btn-sm">📥 Export</button>
      </div>
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={campaigns} selectable rowActions={rowActions} />
      </div>
    </div>
  );
}
