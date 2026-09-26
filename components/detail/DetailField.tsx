import { CheckCircle2, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A single label/value pair. Empty values render an em-dash in a muted tone so
 * "no data" is visually distinct from a real value. `mono` right-sizes ids and
 * codes.
 */
export function DetailField({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value?: string | number | null;
  mono?: boolean;
  className?: string;
}) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className={cn("space-y-1 min-w-0", className)}>
      <p className="text-2xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p
        className={cn(
          "text-sm font-semibold break-words",
          empty
            ? "text-slate-300 dark:text-slate-600"
            : "text-slate-700 dark:text-slate-200",
          mono && !empty && "font-mono text-xs",
        )}
      >
        {empty ? "—" : value}
      </p>
    </div>
  );
}

/**
 * A yes/no row rendered as a labelled pill. `invert` flips the semantics so
 * negative states (flagged, locked, password-change-required) read as red when
 * true.
 */
export function BoolRow({
  label,
  value,
  invert,
}: {
  label: string;
  value?: boolean | null;
  invert?: boolean;
}) {
  const on = !!value;
  const pill =
    on && invert
      ? "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400"
      : on
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 min-w-0">
      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">
        {label}
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-black uppercase tracking-wide shrink-0",
          pill,
        )}
      >
        {on ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
        {on ? "Yes" : "No"}
      </span>
    </div>
  );
}

/** Centered icon + message placeholder for empty / error modal bodies. */
export function EmptyState({
  icon: Icon,
  title,
  message,
}: {
  icon: LucideIcon;
  title: string;
  message?: string;
}) {
  return (
    <div className="text-center py-16">
      <Icon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
      <p className="text-slate-600 dark:text-slate-300 font-bold">{title}</p>
      {message && (
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">{message}</p>
      )}
    </div>
  );
}
