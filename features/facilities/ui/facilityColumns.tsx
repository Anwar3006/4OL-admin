"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Phone, Building2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAddFacilityDialog, useViewFacilityDialog } from "@/features/facilities/data/dialog-hooks";
import { cn, toUppercaseFirstLetter } from "@/lib/utils";
import { useDeleteFacility } from "@/features/facilities/data/useFacilities";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";

function FacilityActionsCell({ facility }: { facility: any }) {
  const { open: openView } = useViewFacilityDialog();
  const { open: openEdit } = useAddFacilityDialog();
  const { mutate: deleteFacility, isPending: isDeleting } =
    useDeleteFacility();
  const { data: session } = useSupabaseSession();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      globalThis.confirm(
        `Are you sure you want to delete "${facility.facility_name}"? This action cannot be undone.`,
      )
    ) {
      deleteFacility({
        adminId: session?.user?.id || "",
        id: facility.id,
      });
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        aria-label="View Details"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          openView(facility.id);
        }}
      >
        👁️
      </Button>
      <Button
        aria-label="Edit"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/15 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          openEdit(facility);
        }}
      >
        ✏️
      </Button>
      <Button
        aria-label="Delete"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15 transition-colors"
        disabled={isDeleting}
        onClick={handleDelete}
      >
        🗑️
      </Button>
    </div>
  );
}

export const facilityColumns: ColumnDef<any>[] = [
  {
    accessorKey: "name",
    header: "Facility",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center text-blue-500 border border-blue-100 dark:border-blue-500/30">
          <Building2 className="h-4 w-4" />
        </div>
        <div>
          <div className="font-black text-slate-800 dark:text-slate-200 text-xs uppercase tracking-tight leading-none mb-1">
            {row.original.facility_name}
          </div>
          <div className="max-w-[220px] truncate text-3xs font-bold uppercase tracking-widest leading-none text-slate-400">
            {[row.original.street, row.original.area, row.original.district]
              .filter(Boolean)
              .join(", ") || "Address not recorded"}
          </div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "facility_type",
    header: "Type",
    cell: ({ row }) => (
      <span className="badge badge-blue whitespace-nowrap capitalize">
        {row.original.facility_type?.replace(/_/g, " ") || "Other"}
      </span>
    ),
  },
  {
    accessorKey: "region",
    header: "Region",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs font-bold text-slate-600 dark:text-slate-300">
        {row.original.region
          ?.split(" ")
          .map(toUppercaseFirstLetter)
          .join(" ") || "—"}
      </span>
    ),
  },
  {
    accessorKey: "hefra_registration_number",
    header: "HEFRA",
    cell: ({ row }) =>
      row.original.hefra_registration_number ? (
        <div>
          <span className="badge badge-green whitespace-nowrap">✅ Verified</span>
          <div className="mt-1 max-w-[130px] truncate text-3xs font-bold text-slate-400">
            {row.original.hefra_registration_number}
          </div>
        </div>
      ) : (
        <span className="badge badge-amber whitespace-nowrap">Pending</span>
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
      const rating = row.original.rating_average ?? row.original.avg_rating;
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
            status === "active"
              ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/30"
              : status === "pending"
                ? "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/30"
                : "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-100 dark:border-red-500/30",
          )}
        >
          {status}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <FacilityActionsCell facility={row.original} />,
  },
];
