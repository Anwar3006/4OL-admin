import React from "react";
import DataTable, { Column, RowAction } from "@/components/redesign/DataTable";
import { Eye, Pencil, Trash2 } from "lucide-react";

export interface DrugRow {
  id: number;
  name: string;
  type: string;
  generic: string;
  category: string;
  availability: string;
  interactions: string;
  active: string;
  status: string;
}

const data: DrugRow[] = [
  { id: 1, name: "Paracetamol 500mg", type: "Tablet", generic: "Acetaminophen", category: "Analgesic", availability: "OTC", interactions: "4 known", active: "3,840", status: "Active" },
  { id: 2, name: "Amoxicillin 250mg", type: "Capsule", generic: "Amoxicillin", category: "Antibiotic", availability: "Prescription", interactions: "12 known", active: "1,120", status: "Active" },
];

export default function DrugDatabaseTab() {
  const columns: Column<DrugRow>[] = [
    { 
      key: "name", 
      label: "Drug Name", 
      render: (val, row) => (
        <div>
          <div className="font-bold text-slate-800">{val}</div>
          <div className="text-[10px] text-slate-400">{row.type} · PharmaCo</div>
        </div>
      )
    },
    { key: "generic", label: "Generic Name" },
    { key: "category", label: "Category", render: (val) => <span className="badge badge-teal">💊 {val}</span> },
    { key: "availability", label: "Availability", render: (val) => <span className="badge badge-indigo">{val}</span> },
    { key: "interactions", label: "Interactions" },
    { key: "active", label: "Active Reminders", render: (val) => <span className="font-bold">{val}</span> },
    { key: "status", label: "Status", render: (val) => <span className="badge badge-green">✅ {val}</span> },
  ];

  const rowActions: RowAction<DrugRow>[] = [
    { label: "View", icon: <Eye className="w-4 h-4" />, onClick: () => {} },
    { label: "Edit", icon: <Pencil className="w-4 h-4" />, onClick: () => {} },
    { label: "Delete", icon: <Trash2 className="w-4 h-4" />, onClick: () => {}, danger: true },
  ];

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input className="flex-1 min-w-[240px] h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none" placeholder="🔍 Search by drug name, generic name, category..." />
        <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"><option>All Categories</option></select>
        <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"><option>All Status</option></select>
        <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white"><option>All Availability</option></select>
        <button className="btn btn-secondary btn-sm">📥 Export</button>
      </div>
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={data} selectable rowActions={rowActions} />
      </div>
    </div>
  );
}
