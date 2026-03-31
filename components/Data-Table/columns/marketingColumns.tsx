"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Mail, BriefcaseBusiness, FileText, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAddMarketingDialog, useViewMarketingDialog } from "@/stores/dialog-store";
import { TMarketingProfileOutput } from "@/schemas/marketing-profile.schema";
import { MarketingStatusMap } from "@/constants/marketing.const";

export const marketingColumns: ColumnDef<TMarketingProfileOutput>[] = [
  {
    accessorKey: "type",
    header: () => <div className="font-semibold">Type</div>,
    cell: ({ row }) => (
      <div className="flex flex-col min-w-18">
        <div className="font-medium text-sm">
          {row.original.marketingType.toLocaleUpperCase()}
        </div>
        {/* Show headline on mobile as subtitle
        <div className="text-xs text-muted-foreground md:hidden truncate">
          {row.original.email}
        </div> */}
      </div>
    ),
  },
  {
    accessorKey: "headline",
    header: () => (
      <div className="font-semibold hidden md:table-cell">Headline</div>
    ),
    cell: ({ row }) => (
      <div className="hidden md:table-cell min-w-40">
        <div className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm truncate">{row.original.headline}</span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "organization",
    header: () => (
      <div className="font-semibold hidden lg:table-cell">Organization</div>
    ),
    cell: ({ row }) => (
      <div className="hidden lg:table-cell min-w-35">
        <div className="flex items-center gap-2">
          <BriefcaseBusiness className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">{row.original.organization}</span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: () => <div className="font-semibold">Status</div>,
    cell: ({ row }) => (
      <div className="min-w-16">{MarketingStatusMap[row.original.status]}</div>
    ),
  },
  {
    accessorKey: "startDate",
    header: () => <div className="font-semibold">Start Date</div>,
    cell: ({ row }) => <div className="min-w-25">{row.original.startDate}</div>,
  },
  {
    accessorKey: "endDate",
    header: () => <div className="font-semibold">End Date</div>,
    cell: ({ row }) => <div className="min-w-25">{row.original.endDate}</div>,
  },
  {
    id: "actions",
    header: () => <div className="sr-only">Actions</div>,
    cell: ({ row }) => {
      const marketing = row.original;
      const { open: openView } = useViewMarketingDialog();
      const { open: openEdit } = useAddMarketingDialog();

      return (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
            onClick={(e) => {
              e.stopPropagation();
              openView(marketing.id);
            }}
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(marketing);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              // handle delete
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];
