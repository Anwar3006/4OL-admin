"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Building2, Phone, ShieldCheck, Star, Store, Stethoscope, Dumbbell, Ambulance } from "lucide-react";
import { cn, toUppercaseFirstLetter } from "@/lib/utils";
import type { ProviderKind, ProviderRow } from "../schema/types";

const KIND_ICON: Record<ProviderKind, React.ComponentType<{ className?: string }>> = {
  care_facility: Building2,
  vendor: Store,
  practitioner: Stethoscope,
  trainer: Dumbbell,
  ambulance_operator: Ambulance,
};

const STATUS_STYLE: Record<string, string> = {
  active:
    "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/30",
  pending:
    "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/30",
  suspended:
    "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-100 dark:border-red-500/30",
  rejected:
    "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-100 dark:border-red-500/30",
  inactive:
    "bg-slate-100 dark:bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/30",
  draft:
    "bg-slate-100 dark:bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/30",
};

const VERIFICATION_STYLE: Record<string, string> = {
  verified: "text-emerald-600 dark:text-emerald-400",
  pending: "text-amber-600 dark:text-amber-400",
  expired: "text-red-600 dark:text-red-400",
  unverified: "text-slate-400",
};

export const providerColumns: ColumnDef<ProviderRow, unknown>[] = [
  {
    accessorKey: "name",
    header: "Provider",
    cell: ({ row }) => {
      const Icon = KIND_ICON[row.original.kind] ?? Building2;
      return (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center text-blue-500 border border-blue-100 dark:border-blue-500/30">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="font-black text-slate-800 dark:text-slate-200 text-xs uppercase tracking-tight leading-none mb-1">
              {row.original.name}
            </div>
            <div className="max-w-[220px] truncate text-3xs font-bold uppercase tracking-widest leading-none text-slate-400">
              {[row.original.area, row.original.district].filter(Boolean).join(", ") || "Address not recorded"}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "kind",
    header: "Kind / Type",
    cell: ({ row }) => (
      <div>
        <span className="badge badge-blue whitespace-nowrap capitalize">
          {row.original.kind.replace(/_/g, " ")}
        </span>
        <div className="mt-1 max-w-[160px] truncate text-3xs font-bold uppercase tracking-widest text-slate-400">
          {row.original.provider_type_label ?? row.original.provider_type.replace(/_/g, " ")}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "region",
    header: "Region",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs font-bold text-slate-600 dark:text-slate-300">
        {row.original.region?.split(" ").map(toUppercaseFirstLetter).join(" ") || "—"}
      </span>
    ),
  },
  {
    accessorKey: "verification_status",
    header: "Verification",
    cell: ({ row }) => (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest",
          VERIFICATION_STYLE[row.original.verification_status] ?? "text-slate-400",
        )}
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        {row.original.verification_status}
      </span>
    ),
  },
  {
    accessorKey: "contact",
    header: "Contact",
    cell: ({ row }) => (
      <div className="min-w-[130px]">
        <div className="flex items-center gap-1.5 text-xs font-black text-slate-600 dark:text-slate-300 tracking-tight leading-none">
          <Phone className="w-3 h-3 text-slate-400" />
          {row.original.contact_number || "N/A"}
        </div>
        {row.original.email && (
          <div className="mt-1 max-w-[170px] truncate text-3xs font-medium text-slate-400">
            {row.original.email}
          </div>
        )}
      </div>
    ),
  },
  {
    accessorKey: "subscription_tier",
    header: "Plan",
    cell: ({ row }) => (
      <span className="badge badge-indigo whitespace-nowrap capitalize">
        {row.original.subscription_tier?.replace(/_/g, " ") || "Free Listing"}
      </span>
    ),
  },
  {
    accessorKey: "rating_average",
    header: "Rating",
    cell: ({ row }) => {
      const rating = row.original.rating_average;
      return rating != null ? (
        <div className="whitespace-nowrap">
          <span className="inline-flex items-center gap-1 text-xs font-black text-amber-600">
            {Number(rating).toFixed(1)}
            <Star className="h-3.5 w-3.5 fill-current" />
          </span>
          <div className="text-3xs font-medium text-slate-400">
            {(row.original.rating_count ?? 0).toLocaleString()} reviews
          </div>
        </div>
      ) : (
        <span className="text-xs font-medium text-slate-400">Not rated</span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status || "pending";
      return (
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-black uppercase tracking-widest border",
            STATUS_STYLE[status] ?? STATUS_STYLE.inactive,
          )}
        >
          {status}
        </span>
      );
    },
  },
];
