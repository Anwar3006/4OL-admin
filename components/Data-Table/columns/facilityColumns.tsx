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
import {
  useAddFacilityDialog,
  useViewFacilityDialog,
} from "@/stores/dialog-store";
import { cn, toUppercaseFirstLetter } from "@/lib/utils";
import { useDeleteFacility } from "@/hooks/supabase-calls/useFacilities";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";

export const facilityColumns: ColumnDef<any>[] = [
  {
    accessorKey: "name",
    header: "Facility",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100">
          <Building2 className="h-4 w-4" />
        </div>
        <div>
          <div className="font-black text-slate-800 text-[11px] uppercase tracking-tight leading-none mb-1">
            {row.original.facility_name}
          </div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">
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
        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-600 tracking-tight leading-none mb-1">
          <Mail className="w-3 h-3 text-slate-400" />
          {row.original.email}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
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
      <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-600 uppercase tracking-tight">
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
            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
            status === "active"
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : status === "pending"
                ? "bg-amber-50 text-amber-700 border-amber-100"
                : "bg-red-50 text-red-700 border-red-100",
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
            className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
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
            className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
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
            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
