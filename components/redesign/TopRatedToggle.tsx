"use client";

import React from "react";
import { Star, Loader2, CalendarClock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  useIsTopRated,
  useUpsertTopRatedItem,
  useRemoveTopRatedItem,
} from "@/features/top-rated/data/useTopRatedItems";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { TOP_RATED_MODULES } from "@/features/top-rated/schema/types";

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
 * `<input type="datetime-local">` speaks "YYYY-MM-DDTHH:mm" in the viewer's
 * local zone; the column is timestamptz. Convert on the way in and out rather
 * than feeding a raw ISO string to the input, which browsers silently reject.
 */
const toLocalInputValue = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toIsoOrNull = (local: string) => {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/**
 * Drop into any entity's view dialog to let an admin curate it in/out of
 * the top_rated_items table for its module. Reuses the same
 * admin_upsert_top_rated_item / admin_remove_top_rated_item RPCs that
 * back the "Add Top Rated Item" flow on the Top Rated page.
 *
 * Marking opens a small scheduling dialog so the placement window can be set
 * from the entity itself instead of only from the Top Rated page. Both fields
 * are optional: left empty the item goes live immediately and stays top rated
 * until it is manually removed.
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

  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [publishFrom, setPublishFrom] = React.useState("");
  const [expireAt, setExpireAt] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);

  // Prefill from the existing row so re-opening edits the window rather than
  // silently resetting it.
  const openScheduler = () => {
    setPublishFrom(toLocalInputValue(topRatedEntry?.publish_from));
    setExpireAt(toLocalInputValue(topRatedEntry?.expire_at));
    setFormError(null);
    setScheduleOpen(true);
  };

  const handleToggle = (next: boolean) => {
    if (!itemId) return;
    if (next) {
      openScheduler();
    } else {
      removeItem({ module, item_id: itemId });
    }
  };

  const confirmMark = () => {
    if (!itemId) return;

    const from = toIsoOrNull(publishFrom);
    const until = toIsoOrNull(expireAt);

    // Mirrors the RPC's own check, so a bad window fails here with a readable
    // message instead of coming back as a raised Postgres exception.
    if (from && until && new Date(until) <= new Date(from)) {
      setFormError("Expire At must be after Publish From.");
      return;
    }

    upsertItem(
      {
        module,
        item_id: itemId,
        title,
        subtitle: subtitle || "",
        image_url: imageUrl?.trim() || null,
        rating: rating ?? undefined,
        rating_count: ratingCount ?? undefined,
        source: "manual",
        admin_id: session?.user?.id || "",
        publish_from: from,
        expire_at: until,
      },
      { onSuccess: () => setScheduleOpen(false) },
    );
  };

  const clearWindow = () => {
    setPublishFrom("");
    setExpireAt("");
    setFormError(null);
  };

  const hasWindow = !!(topRatedEntry?.publish_from || topRatedEntry?.expire_at);

  const scheduleDialog = (
    <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-black">
            {isTopRated ? "Placement window" : "Mark as Top Rated"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Optional. Leave both empty to publish immediately and stay top
            rated until manually removed.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Publish From
            </label>
            <Input
              type="datetime-local"
              value={publishFrom}
              onChange={(e) => {
                setPublishFrom(e.target.value);
                setFormError(null);
              }}
            />
            <p className="text-[10px] text-slate-400">
              Empty = live immediately
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Expire At
            </label>
            <Input
              type="datetime-local"
              value={expireAt}
              onChange={(e) => {
                setExpireAt(e.target.value);
                setFormError(null);
              }}
            />
            <p className="text-[10px] text-slate-400">Empty = never expires</p>
          </div>
        </div>

        {formError && (
          <p className="text-[11px] font-bold text-red-500">{formError}</p>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={clearWindow}
            disabled={isUpserting || (!publishFrom && !expireAt)}
            className="text-xs"
          >
            Clear window
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setScheduleOpen(false)}
            disabled={isUpserting}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={confirmMark}
            disabled={isUpserting}
            className="text-xs bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isUpserting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isTopRated ? (
              "Save window"
            ) : (
              "Mark Top Rated"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (compact) {
    return (
      <div className={cn("inline-flex items-center", className)}>
        <button
          type="button"
          disabled={isBusy || !itemId}
          onClick={() => handleToggle(!isTopRated)}
          className={cn(
            "inline-flex items-center gap-1.5 h-10 px-3 rounded-none border text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-60 disabled:cursor-not-allowed",
            isTopRated
              ? "bg-amber-500 border-amber-500 text-white hover:bg-amber-600"
              : "bg-white border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-600",
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

        {/* Edit the window without having to unmark and re-mark. */}
        {isTopRated && (
          <button
            type="button"
            title="Edit placement window"
            disabled={isBusy}
            onClick={openScheduler}
            className={cn(
              "inline-flex items-center justify-center h-10 w-9 rounded-none border border-l-0 transition-all disabled:opacity-60",
              hasWindow
                ? "bg-amber-100 border-amber-300 text-amber-700"
                : "bg-white border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-300",
            )}
          >
            <CalendarClock className="h-3.5 w-3.5" />
          </button>
        )}

        {scheduleDialog}
      </div>
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

      {isTopRated && (
        <button
          type="button"
          title="Edit placement window"
          disabled={isBusy}
          onClick={openScheduler}
          className={cn(
            "inline-flex items-center justify-center h-7 w-7 rounded-lg border transition-all disabled:opacity-60",
            hasWindow
              ? "bg-amber-100 border-amber-300 text-amber-700"
              : "bg-white border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-300",
          )}
        >
          <CalendarClock className="h-3.5 w-3.5" />
        </button>
      )}

      {isBusy ? (
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      ) : (
        <Switch
          checked={isTopRated}
          onCheckedChange={handleToggle}
          disabled={!itemId}
        />
      )}

      {scheduleDialog}
    </div>
  );
}
