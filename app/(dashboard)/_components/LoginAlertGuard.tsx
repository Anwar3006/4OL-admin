"use client";

/**
 * LoginAlertGuard — concurrent-login interception for the super admin.
 *
 * When /api/admin/session detects a second device signing in while another
 * session is active, it inserts an admin_login_alerts row. This guard picks
 * it up two ways:
 *   1. Supabase Realtime INSERT (RLS-filtered to the owner) — instant pop-up.
 *   2. GET /api/admin/login-alerts on mount — catch-up for devices that
 *      load the dashboard after the insert happened.
 *
 * The modal runs a countdown to alert.expires_at. Choices:
 *   - "Sign out that device" → revokes the new session server-side.
 *   - "Acknowledge"          → accepts the sign-in.
 *   - Timer lapses           → the other device stays signed in (product
 *     decision: lapse is an implicit acknowledge).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { UAParser } from "ua-parser-js";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { LOGIN_ALERT_COUNTDOWN_SECONDS } from "@/lib/login-alerts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PendingAlert = {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: string;
  created_at: string;
  status?: string;
};

/** Countdown lapsed → keep the modal up briefly to explain the outcome. */
const EXPIRED_GRACE_SECONDS = 6;

function describeDevice(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  try {
    const parsed = UAParser(userAgent);
    const browser = parsed.browser?.name || "Unknown browser";
    const os = parsed.os?.name || "unknown OS";
    return `${browser} on ${os}`;
  } catch {
    return userAgent.slice(0, 120);
  }
}

export default function LoginAlertGuard() {
  const [alert, setAlert] = useState<PendingAlert | null>(null);
  const [remaining, setRemaining] = useState(LOGIN_ALERT_COUNTDOWN_SECONDS);
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);
  const seenIdRef = useRef<string | null>(null);

  const showAlert = useCallback((candidate: PendingAlert) => {
    if (seenIdRef.current === candidate.id) return;
    const msLeft = new Date(candidate.expires_at).getTime() - Date.now();
    if (msLeft <= 0) return; // already lapsed — nothing to act on
    seenIdRef.current = candidate.id;
    setExpired(false);
    setRemaining(Math.ceil(msLeft / 1000));
    setAlert(candidate);
  }, []);

  // Catch-up: pick up a pending alert raised before this device loaded.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/login-alerts", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.alert) showAlert(data.alert);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [showAlert]);

  // Realtime: instant pop-up the moment a concurrent login is flagged.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let disposed = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || disposed) return;

      channel = supabase
        .channel("login-alert-guard")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "admin_login_alerts",
            filter: `admin_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as PendingAlert;
            if (row?.status === "pending") showAlert(row);
          },
        )
        .subscribe();
    })();

    return () => {
      disposed = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [showAlert]);

  // Countdown ticker driven by the server's expires_at (not local counts).
  useEffect(() => {
    if (!alert) return;
    const tick = () => {
      const secs = Math.ceil(
        (new Date(alert.expires_at).getTime() - Date.now()) / 1000,
      );
      if (secs <= 0) {
        setRemaining(0);
        setExpired(true);
      } else {
        setRemaining(secs);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [alert]);

  // After lapse, auto-close once the explanation has been shown briefly.
  useEffect(() => {
    if (!expired) return;
    const id = setTimeout(() => setAlert(null), EXPIRED_GRACE_SECONDS * 1000);
    return () => clearTimeout(id);
  }, [expired]);

  const resolve = async (action: "acknowledge" | "lockout") => {
    if (!alert || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/login-alerts/${alert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not resolve the alert.");
        return;
      }
      if (action === "lockout") {
        toast.success(
          data.sessionRevoked
            ? "The other device has been signed out."
            : "Lockout recorded — the other device will be dropped shortly.",
        );
      } else {
        toast.success("Sign-in acknowledged.");
      }
      setAlert(null);
    } catch {
      toast.error("Network error while resolving the alert.");
    } finally {
      setBusy(false);
    }
  };

  const progressPct = Math.max(
    0,
    Math.min(100, (remaining / LOGIN_ALERT_COUNTDOWN_SECONDS) * 100),
  );

  return (
    <Dialog
      open={Boolean(alert)}
      onOpenChange={(open) => {
        // No dismissing a live alert by accident — only closable once it
        // has lapsed (or via one of the explicit buttons).
        if (!open && expired) setAlert(null);
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          if (!expired) e.preventDefault();
        }}
      >
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <ShieldAlert className="h-6 w-6 text-red-600" />
          </div>
          <DialogTitle className="text-center">
            {expired ? "Timer elapsed" : "Another device just signed in"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {expired
              ? "You did not respond in time — the other device stays signed in. If this was not you, sign it out from the Security Center and change your password now."
              : "Your account is already active on another device. Sign it out or acknowledge the sign-in before the timer runs out."}
          </DialogDescription>
        </DialogHeader>

        {alert && (
          <div className="space-y-3">
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              <div>
                <strong>Device:</strong> {describeDevice(alert.user_agent)}
              </div>
              <div className="mt-1">
                <strong>IP:</strong> {alert.ip_address || "Unknown"}
              </div>
              <div className="mt-1">
                <strong>Time:</strong>{" "}
                {new Date(alert.created_at).toLocaleTimeString()}
              </div>
            </div>

            {!expired && (
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Auto-keeps the other device signed in</span>
                  <span className="font-mono font-bold text-red-600">
                    {remaining}s
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-red-500 transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {expired ? (
            <Button
              className="w-full"
              onClick={() => setAlert(null)}
              disabled={busy}
            >
              Close
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => resolve("acknowledge")}
                disabled={busy}
              >
                {busy ? "Working…" : "Acknowledge"}
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => resolve("lockout")}
                disabled={busy}
              >
                {busy ? "Working…" : "Sign out that device"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
