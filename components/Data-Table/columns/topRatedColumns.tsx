"use client";

import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { useRemoveTopRatedItem } from "@/hooks/supabase-calls/useTopRatedItems";
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
          <div className="font-black text-slate-800 text-[11px] uppercase tracking-tight leading-none mb-1">
            {row.original.title}
          </div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">
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
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
        {row.original.module.replace(/_/g, " ")}
      </span>
    ),
  },
  {
    accessorKey: "rating",
    header: "Rating",
    cell: ({ row }) => (
      <div className="text-[11px] font-black text-slate-600">
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
            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
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
      <div className="text-[11px] font-black text-slate-600">
        {row.original.rank ? `#${row.original.rank}` : "—"}
      </div>
    ),
  },
  {
    id: "actions",
    header: "",
    enableHiding: false,
    cell: ({ row }) => {
      const item = row.original;
      const isSubscriptionSourced = item.source === "subscription";
      const { mutate: removeItem, isPending: isRemoving } =
        useRemoveTopRatedItem();

      const handleDelete = () => {
        if (
          confirm("Are you sure you want to remove this item from top-rated?")
        ) {
          removeItem(
            { module: item.module, item_id: item.item_id },
            {
              onSuccess: () => {
                toast.success("Item removed from top-rated");
              },
              onError: (error) => {
                toast.error(`Failed to remove item: ${error.message}`);
              },
            },
          );
        }
      };

      return (
        <div className="flex items-center justify-end gap-2">
          <button
            className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors rounded flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              console.log("View", item.id);
            }}
          >
            👁️
          </button>
          {!isSubscriptionSourced && (
            <button
              className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors rounded flex items-center justify-center disabled:opacity-50"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={isRemoving}
            >
              🗑️
            </button>
          )}
        </div>
      );
    },
  },
];
