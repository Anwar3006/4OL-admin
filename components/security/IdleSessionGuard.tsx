"use client";

import { useEffect, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

/**
 * Part AK (AK-D9) — idle session termination.
 *
 * Signs the admin out after IDLE_LIMIT_MS without any input activity.
 * Rationale: an abandoned logged-in workstation is the easiest screen-read
 * surface there is (and the classic infostealer target); Supabase sessions
 * live for an hour by default, so the app-level timeout is the binding one.
 *
 * Tracked activity: pointer, keyboard, wheel, touch and scroll — throttled
 * so a busy page doesn't hammer the timer reset.
 */

const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30 minutes
const RESET_THROTTLE_MS = 5_000;

export default function IdleSessionGuard() {
  const lastActivity = useRef<number>(Date.now());
  const signOutStarted = useRef(false);

  useEffect(() => {
    const markActivity = () => {
      const now = Date.now();
      if (now - lastActivity.current < RESET_THROTTLE_MS) return;
      lastActivity.current = now;
    };

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "wheel",
      "touchstart",
      "scroll",
    ];
    events.forEach((e) => window.addEventListener(e, markActivity, { passive: true }));

    const interval = setInterval(async () => {
      if (Date.now() - lastActivity.current < IDLE_LIMIT_MS) return;
      if (signOutStarted.current) return;
      signOutStarted.current = true;
      clearInterval(interval);
      try {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
      } finally {
        // Hard redirect regardless of the signOut result — a stale cookie
        // must not survive the idle window.
        window.location.href = "/login?error=session_expired";
      }
    }, 60_000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, markActivity));
      clearInterval(interval);
    };
  }, []);

  return null;
}
