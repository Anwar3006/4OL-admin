import React from "react";
import DataTable, { Column, RowAction } from "@/components/redesign/DataTable";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useMedicationReminders } from "@/hooks/supabase-calls/useMedicationReminder";
import { useViewMediactionReminderDialog } from "@/stores/dialog-store";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function DrugDatabaseTab() {
  const { data, isLoading } = useMedicationReminders({ limit: 10, page: 1 });
  const drugs = data?.data || [];

  const { open: openView } = useViewMediactionReminderDialog();

  const columns: Column<any>[] = [
    { 
      key: "drug_name", 
      label: "Drug Name", 
      render: (val, row) => (
        <div>
          <div className="font-bold text-slate-800">{val}</div>
          <div className="text-[10px] text-slate-400">{row.drug_type || "Medication"}</div>
        </div>
      )
    },
    { key: "dosage_amount", label: "Dosage" },
    { key: "interval", label: "Interval", render: (val, row) => <span>{val} {row.interval_unit}</span> },
    { key: "is_active", label: "Status", render: (val) => <span className={cn("badge", val ? 'badge-green' : 'badge-red')}>✅ {val ? 'Active' : 'Inactive'}</span> },
    { key: "created_at", label: "Created", render: (val) => <span className="text-[10px] font-bold text-slate-400">{format(new Date(val), "MMM dd, yyyy")}</span> },
  ];


  const rowActions: RowAction<any>[] = [
    { label: "View", icon: <Eye className="w-4 h-4" />, onClick: (row) => openView(row.id) },
    { label: "Delete", icon: <Trash2 className="w-4 h-4" />, onClick: (row) => console.log('Delete', row.id), danger: true },
  ];

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input className="flex-1 min-w-[240px] h-8 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none" placeholder="🔍 Search by drug name, generic name, category..." />
        <button className="btn btn-secondary btn-sm">📥 Export</button>
      </div>
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={drugs} selectable rowActions={rowActions} isLoading={isLoading} />
      </div>
    </div>
  );
}
