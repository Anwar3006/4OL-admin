"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Pill, Calendar, Edit, FileText, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useViewMediactionReminderDialog } from "@/stores/dialog-store";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
  purpose: any;
  drug_type: string;
};

export const medicationColumns: ColumnDef<TMedicationReminder>[] = [
  {
    accessorKey: "drug_name",
    header: () => (
      <div className="text-xs font-semibold text-slate-500 uppercase">
        Drug Name
      </div>
    ),
    cell: ({ row }) => {
      const { drug_name, generic_name, drug_type } = row.original;
      return (
        <div className="flex items-center gap-3 py-2">
          <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
            <Pill className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900 text-sm">
              {drug_name}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "dosage",
    header: () => (
      <div className="text-xs font-semibold text-slate-500 uppercase">
        Dosage & Interval
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-900">
          {row.original.dosage_amount}
        </span>
        <span className="text-xs text-slate-500">
          Every {row.original.interval} {row.original.interval_unit.toLowerCase()}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "purpose",
    header: () => (
      <div className="text-xs font-semibold text-slate-500 uppercase">
        Purpose
      </div>
    ),
    cell: ({ row }) => {
      const indications = parseClinicalIndications(row.original.purpose);
      return (
        <div className="flex flex-wrap gap-1">
          {indications.slice(0, 2).map((p: string, i: number) => (
            <Badge
              key={i}
              variant="secondary"
              className="font-normal text-xs bg-slate-100 text-slate-700"
            >
              {p}
            </Badge>
          ))}
          {indications.length > 2 && (
            <span className="text-xs text-slate-500 self-center ml-1">
              +{indications.length - 2}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "dates",
    header: () => (
      <div className="text-xs font-semibold text-slate-500 uppercase">
        Dates
      </div>
    ),
    cell: ({ row }) => {
      const { start_date, end_date } = row.original;
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>{format(new Date(start_date), "MMM d, yyyy")}</span>
          </div>
          {end_date && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="text-slate-300">to</span>
              <span>{format(new Date(end_date), "MMM d, yyyy")}</span>
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: () => (
      <div className="text-xs font-semibold text-slate-500 uppercase">
        Status
      </div>
    ),
    cell: ({ row }) => {
      const active = row.original.is_active && row.original.is_enabled;
      return (
        <div className="flex items-center gap-1.5">
          {active ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <XCircle className="h-4 w-4 text-slate-400" />
          )}
          <span
            className={cn(
              "text-sm font-medium",
              active ? "text-emerald-700" : "text-slate-500"
            )}
          >
            {active ? "Active" : "Inactive"}
          </span>
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
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
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
            className="h-8 w-8 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
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
            className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              // handle delete
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];
