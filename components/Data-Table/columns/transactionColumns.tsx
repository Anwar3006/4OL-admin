"use client";
import { ColumnDef } from "@tanstack/react-table";
import { CreditCard, Calendar, ArrowUpRight, ArrowDownLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const transactionColumns: ColumnDef<any>[] = [
  {
    accessorKey: "id",
    header: "TXN ID",
    cell: ({ row }) => (
      <span className="font-mono text-[10px] font-black text-slate-500 tracking-tighter">
        {row.original.id}
      </span>
    ),
  },
  {
    accessorKey: "user",
    header: "User / Customer",
    cell: ({ row }) => (
      <div>
        <div className="font-black text-slate-800 text-[11px] uppercase tracking-tight leading-none mb-1">
          {row.original.user}
        </div>
        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">
          {row.original.type}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-900 tracking-tight">
        {row.original.status === 'Success' ? (
          <ArrowDownLeft className="h-3 w-3 text-emerald-500" />
        ) : (
          <ArrowUpRight className="h-3 w-3 text-red-500" />
        )}
        {row.original.amount}
      </div>
    ),
  },
  {
    accessorKey: "method",
    header: "Method",
    cell: ({ row }) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200">
        {row.original.method}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const isSuccess = row.original.status === 'Success';
      return (
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
          isSuccess
            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
            : "bg-red-50 text-red-700 border-red-100"
        )}>
          {isSuccess ? "Success" : "Failed"}
        </span>
      );
    },
  },
  {
    accessorKey: "date",
    header: "Timestamp",
    cell: ({ row }) => (
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
        {row.original.date}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>
    ),
  },
];
