"use client";

/**
 * Top-nav support/messages icon.
 *
 * Replaces the placeholder that rendered a static blue dot with no onClick.
 * Shows live counts for the two queues behind it — open `chat_support`
 * tickets and pending moderation flags — and routes into the /chats console
 * tab that actually handles each one.
 *
 * Renders nothing for admins without `chats.view`: the endpoint would 403
 * anyway, and a permanently empty icon is worse than no icon.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert, Ticket } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePermissionContext } from "@/stores/permission-context";
import NavGlyph, { NAV_GLYPH } from "./NavGlyph";
import { cn } from "@/lib/utils";

const POLL_MS = 60_000;

interface TicketRow {
  id: number;
  subject: string | null;
  user_name: string | null;
  priority: string | null;
  status: string | null;
  created_at: string;
}

interface Summary {
  openTickets: number;
  unassignedTickets: number;
  pendingFlags: number;
  total: number;
  recent: TicketRow[];
}

const priorityTone: Record<string, string> = {
  urgent: "text-destructive",
  high: "text-amber-600 dark:text-amber-400",
  medium: "text-sky-600 dark:text-sky-400",
  low: "text-muted-foreground",
};

export default function SupportMessagesButton() {
  const router = useRouter();
  const { hasPermission } = usePermissionContext();
  const canView = hasPermission("chats.view");
  const canModerate = hasPermission("chats.moderate");

  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!canView) return;
    try {
      const res = await fetch("/api/admin/support-summary", {
        cache: "no-store",
      });
      if (res.ok) setSummary(await res.json());
    } catch {
      // Leave the last good summary on screen rather than blanking the badge.
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    if (!canView) return;
    load();
    const id = setInterval(load, POLL_MS);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [canView, load]);

  if (!canView) return null;

  const total = summary?.total ?? 0;
  const badge = total > 99 ? "99+" : String(total);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label={
            total > 0 ? `Support queues, ${total} open items` : "Support queues"
          }
          title="Support & moderation"
        >
          <NavGlyph char={NAV_GLYPH.messages} />
          {total > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-2xs font-bold leading-none text-primary-foreground">
              {badge}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[340px] p-0" sideOffset={8}>
        <div className="border-b border-border px-3 py-2.5 text-sm font-semibold">
          Support &amp; moderation
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
              <button
                type="button"
                onClick={() => go("/chats?tab=support")}
                className="flex flex-col items-start gap-0.5 px-3 py-3 text-left transition-colors hover:bg-muted/60"
              >
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Ticket className="size-3" /> Open tickets
                </span>
                <span className="text-xl font-bold">
                  {summary?.openTickets ?? 0}
                </span>
                <span className="text-2xs text-muted-foreground">
                  {summary?.unassignedTickets ?? 0} unassigned
                </span>
              </button>
              <button
                type="button"
                disabled={!canModerate}
                onClick={() => go("/chats?tab=flagged")}
                className={cn(
                  "flex flex-col items-start gap-0.5 px-3 py-3 text-left transition-colors",
                  canModerate
                    ? "hover:bg-muted/60"
                    : "cursor-not-allowed opacity-50",
                )}
                title={
                  canModerate ? undefined : "Requires the chats.moderate permission"
                }
              >
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldAlert className="size-3" /> Pending flags
                </span>
                <span className="text-xl font-bold">
                  {summary?.pendingFlags ?? 0}
                </span>
                <span className="text-2xs text-muted-foreground">
                  awaiting review
                </span>
              </button>
            </div>

            {summary && summary.recent.length > 0 ? (
              <ul className="divide-y divide-border">
                {summary.recent.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => go("/chats?tab=support")}
                      className="flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-muted/60"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="line-clamp-1 text-xs font-medium">
                          {t.subject ?? "(no subject)"}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-2xs font-bold uppercase",
                            priorityTone[t.priority ?? ""] ??
                              "text-muted-foreground",
                          )}
                        >
                          {t.priority ?? "—"}
                        </span>
                      </span>
                      <span className="flex items-center justify-between gap-2 text-2xs text-muted-foreground">
                        <span className="line-clamp-1">
                          {t.user_name ?? "Unknown user"}
                        </span>
                        <span className="shrink-0">
                          {formatDistanceToNow(new Date(t.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No open tickets.
              </div>
            )}
          </>
        )}

        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => go("/chats")}
          >
            Open Chats console
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
