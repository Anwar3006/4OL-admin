"use client";
import { StatusMap } from "@/constants/facility.const";
import { toUppercaseFirstLetter } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { Mail, Phone } from "lucide-react";

type FacilityRow = {
  id: string;
  facility_type: string;
  facility_name: string;
  email: string;
  contact_number: string;
  region: string;
  status: "pending" | "active" | "inactive" | "rejected";
};

export const facilityColumns: ColumnDef<FacilityRow>[] = [
  {
    accessorKey: "type",
    header: () => (
      <div className="font-semibold hidden 2xl:table-cell">Type</div>
    ),
    cell: ({ row }) => (
      <div className="hidden 2xl:table-cell min-w-25">
        <span className="text-sm">{row.original.facility_type.replace(/_/g, " ").replace(/\//g, "&")}</span>
      </div>
    ),
  },
  {
    accessorKey: "name",
    header: () => <div className="font-semibold">Name</div>,
    cell: ({ row }) => (
      <div className="flex flex-col min-w-37.5">
        <div className="font-medium text-sm">{row.original.facility_name}</div>
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: () => (
      <div className="font-semibold hidden md:table-cell">Email</div>
    ),
    cell: ({ row }) => (
      <div className="hidden md:table-cell min-w-45">
        <div className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm truncate">{row.original.email}</span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "phoneNumber",
    header: () => (
      <div className="font-semibold hidden lg:table-cell">Phone</div>
    ),
    cell: ({ row }) => (
      <div className="hidden lg:table-cell min-w-35">
        <div className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">{row.original.contact_number}</span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "region",
    header: () => (
      <div className="font-semibold hidden xl:table-cell">Region</div>
    ),
    cell: ({ row }) => (
      <div className="hidden xl:table-cell min-w-30">
        <span className="text-sm">
          {row.original.region.split(" ").map(toUppercaseFirstLetter).join(" ")}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: () => <div className="font-semibold">Status</div>,
    cell: ({ row }) => (
      <div className="min-w-25">{StatusMap[row.original.status]}</div>
    ),
  },
];
