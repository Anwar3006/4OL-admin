"use client";

/**
 * Top-nav notification bell.
 *
 * Replaces the placeholder that rendered a hard-coded red dot and had no
 * onClick. Reads the caller's own inbox from /api/admin/notifications,
 * shows a real unread count, marks read (single + all), and routes to the
 * originating module when a notification carries one.
 *
 * Polls every 60s and refetches on window focus — the admin panel has no
 * realtime socket for `notifications`, and a 60s bell is cheap (one
 * head-count + one 20-row page) next to holding a subscription open.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCheck, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePermissionContext } from "@/stores/permission-context";
import NavGlyph, { NAV_GLYPH } from "./NavGlyph";
import { cn } from "@/lib/utils";

const POLL_MS = 60_000;

interface NotificationRow {
  id: string;
  title: string | null;
  body: string | null;
  type: string | null;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

/**
 * Notifications may carry a destination in metadata. Only same-origin
 * relative paths are followed — metadata is written by other services, so a
 * value like "https://evil.example" must never become a live redirect.
 */
function resolveHref(row: NotificationRow): string | null {
  const raw = row.metadata?.["href"] ?? row.metadata?.["url"] ?? null;
  if (typeof raw !== "string") return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

const typeTone: Record<string, string> = {
  security: "bg-destructive",
  alert: "bg-destructive",
  warning: "bg-amber-500",
  system: "bg-sky-500",
};

export default function NotificationBell() {
  const router = useRouter();
  const { hasPermission } = usePermissionContext();
  const canOpenConsole = hasPermission("notifications.view");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications", {
        cache: "no-store",
      });
      if (!res.ok) {
        setFailed(true);
        return;
      }
      const json = await res.json();
      setItems(json.items ?? []);
      setUnread(json.unreadCount ?? 0);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const markRead = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      // Optimistic — the badge should never lag a click.
      setItems((prev) =>
        prev.map((r) => (ids.includes(r.id) ? { ...r, is_read: true } : r)),
      );
      setUnread((n) => Math.max(0, n - ids.length));
      try {
        const res = await fetch("/api/admin/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        if (res.ok) {
          const json = await res.json();
          setUnread(json.unreadCount ?? 0);
        } else {
          load();
        }
      } catch {
        load();
      }
    },
    [load],
  );

  const markAllRead = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setItems((prev) => prev.map((r) => ({ ...r, is_read: true })));
        setUnread(0);
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const onRowClick = (row: NotificationRow) => {
    if (!row.is_read) markRead([row.id]);
    const href = resolveHref(row);
    if (href) {
      setOpen(false);
      router.push(href);
    }
  };

  const badge = unread > 99 ? "99+" : String(unread);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label={
            unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
          }
          title="Notifications"
        >
          <NavGlyph char={NAV_GLYPH.notifications} />
          {unread > 0 && (
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center",
                "rounded-full bg-destructive px-1 text-2xs font-bold leading-none text-white",
              )}
            >
              {badge}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[380px] p-0" sideOffset={8}>
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <div className="text-sm font-semibold">
            Notifications
            {unread > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {unread} unread
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            disabled={busy || unread === 0}
            onClick={markAllRead}
          >
            {busy ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <CheckCheck className="size-3" />
            )}
            Mark all read
          </Button>
        </div>

        <ScrollArea className="max-h-[380px]">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          ) : failed ? (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              Could not load notifications.
              <Button
                variant="link"
                size="sm"
                className="mt-1 block w-full"
                onClick={load}
              >
                Retry
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              You’re all caught up.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((row) => {
                const href = resolveHref(row);
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => onRowClick(row)}
                      className={cn(
                        "flex w-full gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/60",
                        !row.is_read && "bg-primary/5",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 size-1.5 shrink-0 rounded-full",
                          row.is_read
                            ? "bg-transparent"
                            : (typeTone[row.type ?? ""] ?? "bg-primary"),
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span
                            className={cn(
                              "line-clamp-1 text-sm",
                              row.is_read ? "font-medium" : "font-semibold",
                            )}
                          >
                            {row.title ?? "Notification"}
                          </span>
                          <span className="shrink-0 text-2xs text-muted-foreground">
                            {formatDistanceToNow(new Date(row.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </span>
                        {row.body && (
                          <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                            {row.body}
                          </span>
                        )}
                        {href && (
                          <span className="mt-1 block text-2xs font-medium text-primary">
                            Open →
                          </span>
                        )}
                      </span>
                      {!row.is_read && (
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label="Mark as read"
                          title="Mark as read"
                          className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            markRead([row.id]);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              markRead([row.id]);
                            }
                          }}
                        >
                          <Check className="size-3" />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        {canOpenConsole && (
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                setOpen(false);
                router.push("/notifications");
              }}
            >
              Open Notifications console
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
