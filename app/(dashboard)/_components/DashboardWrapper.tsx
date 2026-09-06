"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/db/browser";
import NewAdminDashboardShell from "./admin-shell/NewAdminDashboardShell";
import LoginAlertGuard from "./LoginAlertGuard";

export default function DashboardWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const [isPending, setIsPending] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = getBrowserClient();

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthed(Boolean(session));
      setIsPending(false);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthed(Boolean(session));
      setIsPending(false);

      if (event === "SIGNED_OUT") {
        const token = sessionStorage.getItem("admin_session_token");
        if (token) {
          // NOTE: navigator.sendBeacon() only supports POST -- and POST on
          // this route is the *start* handler, not end. Using it here would
          // silently create a new session row on every sign-out instead of
          // closing the old one, leaking an open admin_sessions row each
          // time. fetch() with keepalive:true is the standard replacement:
          // it survives page unload like sendBeacon but supports DELETE.
          fetch("/api/admin/session", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionToken: token }),
            keepalive: true,
          }).catch(() => {});
          sessionStorage.removeItem("admin_session_token");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Admin session telemetry (Epic 11.3): start a session row once authed,
  // heartbeat it every 5 minutes so admin_sessions.last_active_at stays
  // fresh for the "Online Now" metric, matching the 15-minute freshness
  // window get_admin_dashboard_metrics uses.
  useEffect(() => {
    if (isPending || !isAuthed) return;

    let cancelled = false;
    let heartbeatId: ReturnType<typeof setInterval> | undefined;

    const start = async () => {
      if (sessionStorage.getItem("admin_session_token")) return;
      try {
        const res = await fetch("/api/admin/session", { method: "POST" });
        if (!res.ok || cancelled) return;
        const { sessionToken } = await res.json();
        sessionStorage.setItem("admin_session_token", sessionToken);
      } catch {
        // Non-critical — telemetry failure shouldn't block dashboard access.
      }
    };

    start();

    heartbeatId = setInterval(() => {
      const token = sessionStorage.getItem("admin_session_token");
      if (!token) return;
      fetch("/api/admin/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: token }),
      }).catch(() => {});
    }, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      if (heartbeatId) clearInterval(heartbeatId);
    };
  }, [isPending, isAuthed]);

  useEffect(() => {
    if (!isPending && !isAuthed) {
      router.push("/login");
    }
  }, [isPending, isAuthed, router]);

  if (isPending || !isAuthed) return null;

  return (
    <>
      <NewAdminDashboardShell>{children}</NewAdminDashboardShell>
      {/* Concurrent-login countdown modal for the super admin (no-op for
          everyone else — alerts are only ever raised for super_admin). */}
      <LoginAlertGuard />
    </>
  );
}
