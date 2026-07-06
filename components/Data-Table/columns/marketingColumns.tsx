"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Mail, BriefcaseBusiness, FileText, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAddMarketingDialog,
  useViewMarketingDialog,
} from "@/stores/dialog-store";
import { TMarketingProfileOutput } from "@/schemas/marketing-profile.schema";
import { MarketingStatusMap } from "@/constants/marketing.const";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const marketingColumns: ColumnDef<TMarketingProfileOutput>[] = [
  {
    accessorKey: "headline",
    header: "Campaign",
    cell: ({ row }) => (
      <div>
        <div className="font-black text-slate-800 text-[11px] uppercase tracking-tight">
          {row.original.headline}
        </div>
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          {row.original.marketingType || "Marketing"}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "marketingType",
    header: "Type",
    cell: ({ row }) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100">
        {row.original.marketingType}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
            status === "live"
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-amber-50 text-amber-700 border-amber-100",
          )}
        >
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: "startDate",
    header: "Start Date",
    cell: ({ row }) => (
      <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">
        {format(new Date(row.original.startDate), "MMM dd, yyyy")}
      </span>
    ),
  },
  {
    accessorKey: "endDate",
    header: "End Date",
    cell: ({ row }) => (
      <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">
        {format(new Date(row.original.endDate), "MMM dd, yyyy")}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const marketing = row.original;
      const { open: openView } = useViewMarketingDialog();
      const { open: openEdit } = useAddMarketingDialog();

      return (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              openView(marketing.id);
            }}
          >
            👁️
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(marketing);
            }}
          >
            ✏️
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // handle delete logic here if needed
            }}
          >
            🗑️
          </Button>
        </div>
      );
    },
  },
];
