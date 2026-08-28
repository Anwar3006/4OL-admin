"use client";

/**
 * Top-nav 🚨 alerts icon (mockup admin-panel.html L1103).
 *
 * The mockup wires this straight to the Security Center with a hard-coded
 * "2" badge. Here the badge is derived from real state via the existing
 * `security.view`-gated /api/admin/security-overview: admin accounts with
 * MFA disabled. That is exactly the "Admin MFA disabled" critical alert the
 * mockup's own dashboard banner shows, so the number means something.
 *
 * Hidden entirely without `security.view` — the endpoint 403s for those
 * admins, and the Security Center it links to is gated on the same key.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePermissionContext } from "@/stores/permission-context";
import NavGlyph, { NAV_GLYPH } from "./NavGlyph";

const POLL_MS = 120_000;

interface AdminRow {
  user_id: string;
  name: string;
  mfa_enabled: boolean;
  whitelisted_ips: string[];
}

export default function AlertsButton() {
  const router = useRouter();
  const { hasPermission } = usePermissionContext();
  const canView = hasPermission("security.view");

  const [open, setOpen] = useState(false);
  const [noMfa, setNoMfa] = useState<AdminRow[]>([]);
  const [activeSessions, setActiveSessions] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!canView) return;
    try {
      const res = await fetch("/api/admin/security-overview", {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setNoMfa(
          (json.admins ?? []).filter((a: AdminRow) => !a.mfa_enabled),
        );
        setActiveSessions((json.sessions ?? []).length);
      }
    } catch {
      // Keep the last good reading rather than flashing the badge to zero.
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    if (!canView) return;
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [canView, load]);

  if (!canView) return null;

  const count = noMfa.length;
  const go = () => {
    setOpen(false);
    router.push("/security");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label={
            count > 0 ? `Security alerts, ${count} open` : "Security alerts"
          }
          title="Security alerts"
        >
          <NavGlyph char={NAV_GLYPH.alerts} />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[320px] p-0" sideOffset={8}>
        <div className="border-b border-border px-3 py-2.5 text-sm font-semibold">
          Security alerts
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : count === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            No open security alerts.
            <span className="mt-1 block text-[10px]">
              {activeSessions} active admin session
              {activeSessions === 1 ? "" : "s"}.
            </span>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {noMfa.slice(0, 6).map((a) => (
              <li
                key={a.user_id}
                className="flex items-start gap-2 px-3 py-2 text-xs"
              >
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-destructive" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    MFA disabled — {a.name}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    Admin account without multi-factor authentication
                  </span>
                </span>
              </li>
            ))}
            {count > 6 && (
              <li className="px-3 py-1.5 text-[10px] text-muted-foreground">
                +{count - 6} more
              </li>
            )}
          </ul>
        )}

        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={go}
          >
            Open Security Center
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
