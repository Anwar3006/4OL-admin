"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TMarketingSubscriptionOutput } from "@/schemas/marketing-subscription.schema";

interface SubscriptionColumnsProps {
  onEdit: (row: TMarketingSubscriptionOutput) => void;
  onDelete: (id: string) => void;
}

export const createSubscriptionColumns = ({
  onEdit,
  onDelete,
}: SubscriptionColumnsProps): ColumnDef<TMarketingSubscriptionOutput>[] => [
  {
    accessorKey: "name",
    header: () => <div className="font-semibold">Subscription</div>,
    cell: ({ row }) => (
      <div className="min-w-40">
        <div className="font-medium text-sm">{row.original.name}</div>
        <div className="text-xs text-muted-foreground capitalize">
          {row.original.tierType}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "period",
    header: () => <div className="font-semibold">Period</div>,
    cell: ({ row }) => (
      <div className="min-w-24 text-sm">{row.original.period}</div>
    ),
  },
  {
    accessorKey: "billingCycle",
    header: () => <div className="font-semibold">Billing</div>,
    cell: ({ row }) => (
      <div className="min-w-24 text-sm capitalize">
        {row.original.billingCycle}
      </div>
    ),
  },
  {
    accessorKey: "price",
    header: () => <div className="font-semibold">Price</div>,
    cell: ({ row }) => (
      <div className="min-w-24 text-sm font-medium">
        ${Number(row.original.price || 0).toFixed(2)}
      </div>
    ),
  },
  {
    accessorKey: "tierLimit",
    header: () => <div className="font-semibold">Tier Limit</div>,
    cell: ({ row }) => (
      <div className="min-w-20 text-sm">{row.original.tierLimit}</div>
    ),
  },
  {
    accessorKey: "privileges",
    header: () => <div className="font-semibold">Privileges</div>,
    cell: ({ row }) => (
      <div className="min-w-28 text-sm">
        {row.original.privileges?.length || 0}
      </div>
    ),
  },
  {
    accessorKey: "isActive",
    header: () => <div className="font-semibold">Status</div>,
    cell: ({ row }) => (
      <span
        className={
          row.original.isActive
            ? "text-green-600 font-medium"
            : "text-muted-foreground"
        }
      >
        {row.original.isActive ? "Active" : "Inactive"}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <div className="font-semibold text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(row.original);
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(row.original.id);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    ),
  },
];
