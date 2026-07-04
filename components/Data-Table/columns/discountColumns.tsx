"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Tag, Calendar, Edit, FileText, Trash2, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const discountColumns: ColumnDef<any>[] = [
  {
    accessorKey: "code",
    header: "Discount Code",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100">
          <Tag className="h-4 w-4" />
        </div>
        <div>
          <div className="font-black text-slate-800 text-[11px] uppercase tracking-tight leading-none mb-1">
            {row.original.code}
          </div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">
            {row.original.description || "No description"}
          </div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "value",
    header: "Value",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-600 uppercase tracking-tight">
        <Percent className="w-3 h-3 text-slate-400" />
        {row.original.discount_value}{row.original.discount_type === 'percentage' ? '%' : ' OFF'}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status || 'active';
      return (
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
          status === 'active'
            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
            : "bg-red-50 text-red-700 border-red-100"
        )}>
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: "duration",
    header: "Duration",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-600 uppercase tracking-tight leading-none mb-1">
          <Calendar className="w-3 h-3 text-slate-400" />
          {format(new Date(row.original.start_date), "MMM dd")} - {format(new Date(row.original.end_date), "MMM dd, yyyy")}
        </div>
      </div>
    )
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <FileText className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
  },
];
