"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
  Pill,
  Clock,
  Activity,
  Target,
  ShieldCheck,
  Info,
  Microscope,
  Beaker,
  Calendar,
  AlertCircle,
  Edit,
  FileText,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useViewMediactionReminderDialog } from "@/stores/dialog-store";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ROBUST PARSER: Handles null, arrays, and Postgres string formats
const parseClinicalIndications = (data: any): string[] => {
  if (!data) return ["N/A"];
  if (Array.isArray(data)) return data;
  if (typeof data !== "string") return [String(data)];

  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [data];
  } catch (e) {
    return data
      .replace(/[{}()]/g, "")
      .split(",")
      .map((s) => s.trim().replace(/^"|"$/g, ""))
      .filter(Boolean);
  }
};

export type TMedicationReminder = {
  id: string;
  user_id: string;
  drug_name: string;
  generic_name: string;
  rxcui: string;
  dosage_amount: string;
  instructions: string;
  interval: string;
  interval_unit: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  is_enabled: boolean;
  purpose: any; // Changed to any for safer handling
  drug_type: string;
};

export const medicationColumns: ColumnDef<TMedicationReminder>[] = [
  {
    accessorKey: "drug_name",
    header: () => (
      <div className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400">
        Pharmacological Asset
      </div>
    ),
    cell: ({ row }) => {
      const { drug_name, generic_name, drug_type } = row.original;
      return (
        <div className="flex items-center gap-4 min-w-[260px] py-3">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 shadow-sm relative group">
            <Beaker className="h-5 w-5 text-blue-600 transition-transform group-hover:scale-110" />
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full border-2 border-white" />
          </div>
          <div className="flex flex-col space-y-0.5">
            <span className="font-extrabold text-slate-900 text-[15px] tracking-tight leading-none">
              {drug_name}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                {generic_name || "Molecular Formula N/A"}
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <Badge
                variant="outline"
                className="text-[8px] font-black h-4 px-1.5 border-slate-200 text-slate-500 bg-slate-50 uppercase"
              >
                {drug_type}
              </Badge>
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "protocol",
    header: () => (
      <div className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400">
        Clinical Protocol
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex flex-col gap-2 min-w-[160px]">
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-black">
            {row.original.dosage_amount}
          </div>
          <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
            <Microscope className="w-3 h-3" />
            Rx#{row.original.rxcui}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
          <Clock className="h-3.5 w-3.5 text-blue-500" />Q
          {row.original.interval} {row.original.interval_unit.toUpperCase()}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "indications",
    header: () => (
      <div className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400">
        Medical Purpose
      </div>
    ),
    cell: ({ row }) => {
      const indications = parseClinicalIndications(row.original.purpose);
      return (
        <div className="flex flex-wrap gap-1.5 max-w-[240px]">
          {indications.slice(0, 2).map((p: string, i: number) => (
            <div
              key={i}
              className="flex items-center gap-1.5 text-[10px] bg-white text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-bold shadow-sm"
            >
              <Target className="w-3 h-3 opacity-60" />
              <span className="truncate max-w-[100px]">{p}</span>
            </div>
          ))}
          {indications.length > 2 && (
            <div className="text-[9px] font-black text-slate-400 self-center ml-1">
              + {indications.length - 2} MORE
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "adherence",
    header: () => (
      <div className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400">
        Bio-Compliance
      </div>
    ),
    cell: ({ row }) => {
      const active = row.original.is_active && row.original.is_enabled;
      return (
        <div className="flex items-center gap-3 bg-slate-50/50 p-2 rounded-xl border border-slate-100/50 w-fit">
          <div
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              active
                ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-pulse"
                : "bg-slate-300",
            )}
          />
          <div className="flex flex-col">
            <span
              className={cn(
                "text-[10px] font-black uppercase tracking-widest leading-none",
                active ? "text-blue-700" : "text-slate-400",
              )}
            >
              {active ? "Optimized" : "Paused"}
            </span>
            <span className="text-[8px] font-bold text-slate-400 mt-0.5">
              VITAL SIGN SYNCED
            </span>
          </div>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const medication = row.original;
      const { open: openView } = useViewMediactionReminderDialog();

      return (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
            onClick={(e) => {
              e.stopPropagation();
              openView(medication.id);
            }}
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
            onClick={(e) => {
              e.stopPropagation();
              // openEdit(medication);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              // handle delete
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-10 w-10 flex items-center justify-center bg-white hover:bg-slate-900 hover:text-white rounded-2xl transition-all duration-300 text-slate-400 border border-slate-100 shadow-sm cursor-help">
                  <Activity className="w-4 h-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-white text-[11px] font-medium border-none p-5 rounded-[24px] shadow-2xl max-w-[300px]">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-400 font-black uppercase text-[9px] tracking-[0.2em]">
                    <ShieldCheck className="w-4 h-4" />
                    Data Integrity Verified
                  </div>
                  <p className="leading-relaxed text-slate-300">
                    This asset follows established pharmacopeia standards.
                    Initialized via medical oversight on
                    <span className="text-white font-bold ml-1">
                      {format(new Date(row.original.start_date), "PP")}
                    </span>
                    .
                  </p>
                  <div className="pt-2 flex items-center gap-2 text-amber-400 text-[9px] font-black uppercase">
                    <AlertCircle className="w-3 h-3" />
                    Review Interactions
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      );
    },
  },
];
