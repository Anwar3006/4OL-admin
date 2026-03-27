"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DiscountType {
  id: string;
  name: string;
  discount_value: number;
  type: "percentage" | "fixed" | "bogo";
  code: string;
  usage: string;
  createdAt?: string;
  updatedAt?: string;
}

export const discountColumns: ColumnDef<DiscountType>[] = [
  {
    accessorKey: "name",
    header: () => <div className="font-semibold">Discount Name</div>,
    cell: ({ row }) => (
      <div className="flex flex-col min-w-32">
        <div className="font-medium text-sm">{row.original.name}</div>
      </div>
    ),
  },
  {
    accessorKey: "value",
    header: () => (
      <div className="font-semibold hidden md:table-cell">Value</div>
    ),
    cell: ({ row }) => (
      <div className="hidden md:table-cell min-w-24">
        <div className="text-sm">
          {row.original.type === "percentage"
            ? `${row.original.discount_value}%`
            : `$${row.original.discount_value}`}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "type",
    header: () => (
      <div className="font-semibold hidden lg:table-cell">Discount Type</div>
    ),
    cell: ({ row }) => (
      <div className="hidden lg:table-cell min-w-32">
        <div className="text-sm capitalize">
          {row.original.type === "percentage"
            ? "Percentage Discount"
            : row.original.type === "fixed"
              ? "Fixed Amount"
              : "Buy One Get One"}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "code",
    header: () => <div className="font-semibold">Code</div>,
    cell: ({ row }) => (
      <div className="min-w-24">
        <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded w-fit">
          {row.original.code}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "usage",
    header: () => <div className="font-semibold">Usage</div>,
    cell: ({ row }) => (
      <div className="min-w-20">
        <div className="text-sm">{row.original.usage}</div>
      </div>
    ),
  },
  {
    accessorKey: "actions",
    header: () => <div className="font-semibold">Actions</div>,
    cell: ({ row }) => (
      <div className="flex gap-2 min-w-24">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          title="Edit"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
  },
];
