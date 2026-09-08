"use client";
import { ColumnDef } from "@tanstack/react-table";
import {
  Mail,
  Phone,
  Edit,
  FileText,
  Trash2,
  MapPin,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAddFacilityDialog, useViewFacilityDialog } from "@/features/facilities/data/dialog-hooks";
import { cn, toUppercaseFirstLetter } from "@/lib/utils";
import { useDeleteFacility } from "@/features/facilities/data/useFacilities";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";

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
          <div className="text-3xs text-slate-400 font-bold uppercase tracking-widest leading-none">
            {row.original.facility_type?.replace(/_/g, " ")}
          </div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "contact",
    header: "Contact",
    cell: ({ row }) => (
      <div>
        <div className="flex items-center gap-1.5 text-xs font-black text-slate-600 dark:text-slate-300 tracking-tight leading-none mb-1">
          <Mail className="w-3 h-3 text-slate-400" />
          {row.original.email}
        </div>
        <div className="flex items-center gap-1.5 text-2xs font-bold text-slate-400 uppercase tracking-widest leading-none">
          <Phone className="w-3 h-3 text-slate-400" />
          {row.original.contact_number || "N/A"}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "location",
    header: "Location",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-tight">
        <MapPin className="w-3 h-3 text-slate-400" />
        {row.original.region?.split(" ").map(toUppercaseFirstLetter).join(" ")}
      </div>
    ),
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
    cell: ({ row }) => {
      const facility = row.original;
      const { open: openView } = useViewFacilityDialog();
      const { open: openEdit } = useAddFacilityDialog();
      const { mutate: deleteFacility, isPending: isDeleting } =
        useDeleteFacility();
      const { data: session } = useSupabaseSession();

      const handleDelete = (e: any) => {
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
          <Button aria-label="View Details"
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
          <Button aria-label="Edit"
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
          <Button aria-label="Delete"
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
    },
  },
];
