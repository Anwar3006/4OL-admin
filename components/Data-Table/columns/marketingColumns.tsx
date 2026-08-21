"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  useAddMarketingDialog,
  useViewMarketingDialog,
} from "@/stores/dialog-store";
import {
  useDeleteMarketingProfile,
  useUpdateMarketingProfile,
} from "@/hooks/supabase-calls/useMarketing";
import { TMarketingProfileOutput } from "@/schemas/marketing-profile.schema";
import { MarketingStatusMap } from "@/constants/marketing.const";
import { format } from "date-fns";

/**
 * Gap Analysis Part M (M3/M4): row actions cover the lifecycle —
 * Pause/Resume for running campaigns, Approve/Reject for business
 * submissions awaiting review, Edit/Delete behind marketing.edit/delete.
 */
export const marketingColumns: ColumnDef<TMarketingProfileOutput>[] = [
  {
    accessorKey: "headline",
    header: "Campaign",
    cell: ({ row }) => (
      <div>
        <div className="font-black text-slate-800 text-[11px] uppercase tracking-tight">
          {row.original.headline}
        </div>
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          {row.original.marketingType || "Marketing"}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "campaign_type",
    header: "Type",
    cell: ({ row }) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100">
        {row.original.campaign_type ?? row.original.marketingType}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => MarketingStatusMap[row.original.status] ?? row.original.status,
  },
  {
    accessorKey: "startDate",
    header: "Start Date",
    cell: ({ row }) => (
      <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">
        {row.original.startDate ? format(new Date(row.original.startDate), "MMM dd, yyyy") : "—"}
      </span>
    ),
  },
  {
    accessorKey: "endDate",
    header: "End Date",
    cell: ({ row }) => (
      <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">
        {row.original.endDate ? format(new Date(row.original.endDate), "MMM dd, yyyy") : "—"}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const marketing = row.original;
      const { open: openView } = useViewMarketingDialog();
      const { open: openEdit } = useAddMarketingDialog();
      const deleteMutation = useDeleteMarketingProfile();
      const updateMutation = useUpdateMarketingProfile();

      const setStatus = (status: string) =>
        updateMutation.mutate({ id: marketing.id, data: { status } });

      return (
        <div className="flex items-center justify-end gap-1">
          {marketing.status === "pending_review" && (
            <>
              <Button
                aria-label="Approve"
                title="Approve & Launch"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setStatus("live");
                }}
              >
                ✅
              </Button>
              <Button
                aria-label="Reject"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setStatus("rejected");
                }}
              >
                ❌
              </Button>
            </>
          )}
          {marketing.status === "live" && (
            <Button
              aria-label="Pause"
              title="Pause campaign"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setStatus("paused");
              }}
            >
              ⏸️
            </Button>
          )}
          {(marketing.status === "paused" ||
            marketing.status === "draft" ||
            marketing.status === "scheduled") && (
            <Button
              aria-label="Launch"
              title="Launch campaign"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setStatus("live");
              }}
            >
              ▶️
            </Button>
          )}
          <Button
            aria-label="View Details"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              openView(marketing.id);
            }}
          >
            👁️
          </Button>
          <Button
            aria-label="Edit"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(marketing);
            }}
          >
            ✏️
          </Button>
          <Button
            aria-label="Delete"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            disabled={deleteMutation.isPending}
            onClick={(e) => {
              e.stopPropagation();
              deleteMutation.mutate({
                id: marketing.id,
                imageUrl: marketing.imageUrl,
              });
            }}
          >
            🗑️
          </Button>
        </div>
      );
    },
  },
];
