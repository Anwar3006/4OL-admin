import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";

export const ACCURACY_CLS = {
  good: "text-emerald-600",
  warn: "text-amber-600",
  bad: "text-red-600",
} as const;

export function accuracyClass(accuracy: number, target: number) {
  if (accuracy >= target) return ACCURACY_CLS.good;
  if (accuracy >= target - 5) return ACCURACY_CLS.warn;
  return ACCURACY_CLS.bad;
}

export function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
        {value}
      </span>
    </div>
  );
}

export function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm font-medium text-slate-400 dark:border-slate-700">
      {label}
    </div>
  );
}

export function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className="h-32 text-center text-sm font-medium text-slate-400"
      >
        {label}
      </TableCell>
    </TableRow>
  );
}
