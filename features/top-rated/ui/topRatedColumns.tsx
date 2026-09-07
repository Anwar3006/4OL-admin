"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  getTopRatedWindowStatus,
  useRemoveTopRatedItem,
} from "@/features/top-rated/data/useTopRatedItems";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const getModuleIcon = (module: string) => {
  const icons: Record<string, string> = {
    facility: "🏥",
    outdoor_route: "🗺️",
    outdoor_event: "📅",
    challenge: "🏆",
    exercise: "🏋️",
    fitness_plan: "📋",
  };
  return icons[module] || "📦";
};

// Gap Analysis T-D4 — deep-link each curated item back to its module page.
const getModuleRoute = (module: string): string => {
  const routes: Record<string, string> = {
    facility: "/facilities",
    outdoor_route: "/fitness?tab=outdoor",
    outdoor_event: "/fitness?tab=outdoor",
    challenge: "/fitness?tab=challenges",
    exercise: "/fitness?tab=exercises",
    fitness_plan: "/fitness?tab=plans",
  };
  return routes[module] || "/top-rated";
};

const windowStatusStyles: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-100",
  scheduled: "bg-amber-50 text-amber-700 border-amber-100",
  expired: "bg-red-50 text-red-600 border-red-100",
};

export const topRatedItemColumns: ColumnDef<any>[] = [
  {
    accessorKey: "title",
    header: "Item",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100">
          {getModuleIcon(row.original.module)}
        </div>
        <div>
          <div className="font-black text-slate-800 text-xs uppercase tracking-tight leading-none mb-1">
            {row.original.title}
          </div>
          <div className="text-3xs text-slate-400 font-bold uppercase tracking-widest leading-none">
            {row.original.subtitle || row.original.module}
          </div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "module",
    header: "Module",
    cell: ({ row }) => (
      <span className="text-2xs font-bold uppercase tracking-widest text-slate-600">
        {row.original.module.replace(/_/g, " ")}
      </span>
    ),
  },
  {
    accessorKey: "rating",
    header: "Rating",
    cell: ({ row }) => (
      <div className="text-xs font-black text-slate-600">
        {row.original.rating
          ? `⭐ ${row.original.rating.toFixed(1)} (${row.original.rating_count || 0})`
          : "—"}
      </div>
    ),
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => {
      const source = row.original.source;
      return (
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-black uppercase tracking-widest border",
            source === "subscription"
              ? "bg-purple-50 text-purple-700 border-purple-100"
              : "bg-emerald-50 text-emerald-700 border-emerald-100",
          )}
        >
          {source === "subscription" ? "💎 Subscription" : "📝 Manual"}
        </span>
      );
    },
  },
  {
    accessorKey: "rank",
    header: "Rank",
    cell: ({ row }) => (
      <div className="text-xs font-black text-slate-600">
        {row.original.rank ? `#${row.original.rank}` : "—"}
      </div>
    ),
  },
  {
    id: "window-status",
    header: "Status",
    cell: ({ row }) => {
      // Gap Analysis T-D2 — lazy placement-window status chip.
      const status = getTopRatedWindowStatus(row.original);
      return (
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-black uppercase tracking-widest border",
            windowStatusStyles[status],
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
    enableHiding: false,
    cell: ({ row }) => {
      const item = row.original;
      const isSubscriptionSourced = item.source === "subscription";
      const router = useRouter();
      const [confirmOpen, setConfirmOpen] = useState(false);
      const { mutate: removeItem, isPending: isRemoving } =
        useRemoveTopRatedItem();

      const handleDelete = () => {
        removeItem(
          { module: item.module, item_id: item.item_id },
          {
            onSuccess: () => {
              setConfirmOpen(false);
              toast.success("Item removed from top-rated");
            },
            onError: (error) => {
              setConfirmOpen(false);
              toast.error(`Failed to remove item: ${error.message}`);
            },
          },
        );
      };

      return (
        <div className="flex items-center justify-end gap-2">
          <button aria-label="View Details"
            className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors rounded flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              router.push(getModuleRoute(item.module));
            }}
          >
            👁️
          </button>
          {!isSubscriptionSourced && (
            <button aria-label="Delete"
              className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors rounded flex items-center justify-center disabled:opacity-50"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmOpen(true);
              }}
              disabled={isRemoving}
            >
              🗑️
            </button>
          )}

          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove top-rated item?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes <span className="font-semibold">{item.title}</span>{" "}
                  from the {item.module.replace(/_/g, " ")} top-rated shelf.
                  The underlying record is not deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isRemoving ? "Removing..." : "Remove"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    },
  },
];
