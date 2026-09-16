"use client";

import { useEffect, useRef, useState } from "react";
import { getBrowserClient } from "@/lib/db/browser";

/**
 * Part AK (AK-D9) — idle session termination.
 *
 * Signs the admin out after the saved session_timeout_mins without activity.
 * Rationale: an abandoned logged-in workstation is the easiest screen-read
 * surface there is (and the classic infostealer target). A warning appears
 * before termination and activity is synchronized across browser tabs.
 *
 * Tracked activity: pointer, keyboard, wheel, touch and scroll — throttled
 * so a busy page doesn't hammer the timer reset.
 */

/**
 * Must match DEFAULT_TIMEOUT_MINUTES in app/api/admin/session-policy/route.ts
 * and the zod default in app/api/settings/security/route.ts.
 *
 * It was 30 while both of those said 60, and this value is not a rare edge
 * case: it is what every admin runs on until the policy fetch below resolves,
 * and what they keep if that one request fails. A cold start, a token refresh
 * landing mid-flight or a dropped connection therefore halved the configured
 * timeout with nothing logged and nothing shown.
 */
const FALLBACK_IDLE_LIMIT_MS = 60 * 60 * 1000;
const WARNING_WINDOW_MS = 2 * 60 * 1000;
const RESET_THROTTLE_MS = 5_000;
/** Re-read the policy so a saved change reaches open tabs without a reload. */
const POLICY_REFRESH_MS = 10 * 60 * 1000;
const LAST_ACTIVITY_KEY = "4ol-admin-last-activity";

function formatRemaining(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function IdleSessionGuard() {
  const lastActivity = useRef(0);
  const idleLimit = useRef(FALLBACK_IDLE_LIMIT_MS);
  const signOutStarted = useRef(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  useEffect(() => {
    const markActivity = (force = false) => {
      const now = Date.now();
      if (!force && now - lastActivity.current < RESET_THROTTLE_MS) return;
      lastActivity.current = now;
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      setRemainingSeconds(null);
    };

    // Mounting a newly authenticated dashboard is activity. Never inherit a
    // stale timestamp from a previous signed-out session.
    markActivity(true);

    // Fetched on mount and then periodically: a single failed request used to
    // pin the tab to the fallback for its whole lifetime, and a timeout saved
    // in Settings never reached tabs that were already open.
    const loadPolicy = async () => {
      try {
        const response = await fetch("/api/admin/session-policy", { cache: "no-store" });
        if (!response.ok) return;
        const policy = (await response.json()) as { sessionTimeoutMinutes?: number };
        const minutes = Number(policy?.sessionTimeoutMinutes);
        if (Number.isFinite(minutes) && minutes >= 5 && minutes <= 720) {
          idleLimit.current = minutes * 60 * 1000;
        }
      } catch {
        // Keep the current limit and try again on the next refresh.
      }
    };
    void loadPolicy();
    const policyTimer = setInterval(() => void loadPolicy(), POLICY_REFRESH_MS);

    const syncActivity = (event: StorageEvent) => {
      if (event.key !== LAST_ACTIVITY_KEY || !event.newValue) return;
      const timestamp = Number(event.newValue);
      if (!Number.isFinite(timestamp) || timestamp <= lastActivity.current) return;
      lastActivity.current = timestamp;
      setRemainingSeconds(null);
    };

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "wheel",
      "touchstart",
      "focus",
    ];
    const handleActivity = () => markActivity(false);
    events.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true }),
    );
    // Scroll separately, in the CAPTURE phase. Scroll events fired by an
    // element do not bubble, so a plain window listener only ever saw the
    // document scrolling -- and most of this dashboard scrolls inside its
    // own containers (every .tbl wrapper, every modal body). Reading a long
    // table by scrolling it therefore counted as being idle.
    window.addEventListener("scroll", handleActivity, { passive: true, capture: true });
    // Returning to the tab is activity: an admin who spent the window in
    // another tab should not be signed out the instant they come back.
    const handleVisibility = () => {
      if (document.visibilityState === "visible") markActivity(true);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("storage", syncActivity);

    const interval = setInterval(async () => {
      const sharedActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
      if (Number.isFinite(sharedActivity) && sharedActivity > lastActivity.current) {
        lastActivity.current = sharedActivity;
      }
      const remaining = idleLimit.current - (Date.now() - lastActivity.current);
      if (remaining > WARNING_WINDOW_MS) {
        setRemainingSeconds(null);
        return;
      }
      if (remaining > 0) {
        setRemainingSeconds(Math.max(1, Math.ceil(remaining / 1000)));
        return;
      }
      if (signOutStarted.current) return;
      signOutStarted.current = true;
      clearInterval(interval);
      try {
        const supabase = getBrowserClient();
        await supabase.auth.signOut();
      } finally {
        // Hard redirect regardless of the signOut result — a stale cookie
        // must not survive the idle window.
        window.location.href = "/login?error=session_expired";
      }
    }, 1_000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      // The capture flag has to match the one used to add it, or the
      // listener is never removed.
      window.removeEventListener("scroll", handleActivity, { capture: true });
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("storage", syncActivity);
      clearInterval(interval);
      clearInterval(policyTimer);
    };
  }, []);

  if (remainingSeconds === null) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-warning-title"
      aria-describedby="idle-warning-description"
    >
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl dark:border-amber-800 dark:bg-slate-900">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl dark:bg-amber-950">
          ⏳
        </div>
        <h2 id="idle-warning-title" className="text-lg font-bold text-slate-900 dark:text-white">
          Your admin session is about to expire
        </h2>
        <p id="idle-warning-description" className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          For security, you’ll be signed out after the configured period without activity.
        </p>
        <div className="my-5 rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800">
          <div className="text-3xl font-black tabular-nums text-amber-700 dark:text-amber-300">
            {formatRemaining(remainingSeconds)}
          </div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            remaining
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={() => {
            const now = Date.now();
            lastActivity.current = now;
            localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
            setRemainingSeconds(null);
          }}
        >
          Stay signed in
        </button>
      </div>
    </div>
  );
}
