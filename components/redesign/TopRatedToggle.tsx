"use client";

import React from "react";
import { Star, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  useIsTopRated,
  useUpsertTopRatedItem,
  useRemoveTopRatedItem,
} from "@/hooks/supabase-calls/useTopRatedItems";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { TOP_RATED_MODULES } from "@/schemas/top-rated.schema";

type TopRatedModule = (typeof TOP_RATED_MODULES)[number];

interface TopRatedToggleProps {
  module: TopRatedModule;
  itemId?: string | null;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
  /** Compact renders as an icon-only pill for tighter header bars */
  compact?: boolean;
  className?: string;
}

/**
 * Drop into any entity's view dialog to let an admin curate it in/out of
 * the top_rated_items table for its module. Reuses the same
 * admin_upsert_top_rated_item / admin_remove_top_rated_item RPCs that
 * back the "Add Top Rated Item" flow on the Top Rated page.
 */
export function TopRatedToggle({
  module,
  itemId,
  title,
  subtitle,
  imageUrl,
  rating,
  ratingCount,
  compact = false,
  className,
}: TopRatedToggleProps) {
  const { data: session } = useSupabaseSession();
  const { data: topRatedEntry, isLoading } = useIsTopRated(module, itemId);
  const { mutate: upsertItem, isPending: isUpserting } =
    useUpsertTopRatedItem();
  const { mutate: removeItem, isPending: isRemoving } =
    useRemoveTopRatedItem();

  const isTopRated = !!topRatedEntry;
  const isBusy = isLoading || isUpserting || isRemoving;

  const handleToggle = (next: boolean) => {
    if (!itemId) return;

    if (next) {
      upsertItem({
        module,
        item_id: itemId,
        title,
        subtitle: subtitle || "",
        image_url: imageUrl?.trim() || null,
        rating: rating ?? undefined,
        rating_count: ratingCount ?? undefined,
        source: "manual",
        admin_id: session?.user?.id || "",
      });
    } else {
      removeItem({ module, item_id: itemId });
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        disabled={isBusy || !itemId}
        onClick={() => handleToggle(!isTopRated)}
        className={cn(
          "inline-flex items-center gap-1.5 h-10 px-3 rounded-none border text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-60 disabled:cursor-not-allowed",
          isTopRated
            ? "bg-amber-500 border-amber-500 text-white hover:bg-amber-600"
            : "bg-white border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-600",
          className,
        )}
      >
        {isBusy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Star
            className={cn(
              "h-3.5 w-3.5",
              isTopRated && "fill-white text-white",
            )}
          />
        )}
        {isTopRated ? "Top Rated" : "Mark Top Rated"}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 h-11 rounded-xl border bg-white",
        isTopRated ? "border-amber-200 bg-amber-50" : "border-slate-200",
        className,
      )}
    >
      <Star
        className={cn(
          "h-4 w-4 shrink-0",
          isTopRated ? "fill-amber-500 text-amber-500" : "text-slate-400",
        )}
      />
      <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
        Top Rated
      </span>
      {isBusy ? (
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      ) : (
        <Switch
          checked={isTopRated}
          onCheckedChange={handleToggle}
          disabled={!itemId}
        />
      )}
    </div>
  );
}
