import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { humanize } from "./formatters";

/**
 * Shared status/role badge tones so every detail modal and table speaks the
 * same colour language (emerald = good, amber = pending, red = blocked, etc.).
 */
export const STATUS_STYLES: Record<string, string> = {
  active:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400",
  approved:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400",
  verified:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400",
  completed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400",
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400",
  pending_verification:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400",
  in_review:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400",
  inactive:
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
  draft:
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
  suspended:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-400",
  rejected:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400",
  banned:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400",
  deleted:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      className={cn(
        "px-3 py-1 text-2xs font-black uppercase tracking-widest border",
        STATUS_STYLES[status] || STATUS_STYLES.inactive,
      )}
    >
      {humanize(status)}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const tone =
    role === "super_admin"
      ? "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-400"
      : role === "admin"
        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400"
        : "bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
  return (
    <Badge
      className={cn(
        "px-3 py-1 text-2xs font-black uppercase tracking-widest border",
        tone,
      )}
    >
      {humanize(role)}
    </Badge>
  );
}
