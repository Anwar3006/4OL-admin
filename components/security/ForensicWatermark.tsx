"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

/**
 * Part AK (AK-D6) — forensic watermark overlay.
 *
 * Renders the signed-in admin's identity (email + per-tab session nonce +
 * date) as a tiled, rotated, low-opacity layer across every dashboard page.
 * Any screenshot — human or AI-assisted — of member data, financials or
 * chats carries the exact session that produced it, converting leak
 * scenarios T3 (infostealer) and T4 (insider feeding screenshots to an LLM)
 * from undetectable to attributable.
 *
 * Design choices:
 *   - opacity ~0.045: legible in a zoomed screenshot, invisible in normal
 *     use; admins report they stop noticing it within a day.
 *   - pointer-events-none + user-select-none: never interferes with work.
 *   - nonce per tab (sessionStorage): two tabs of the same account are
 *     still distinguishable in a leak.
 *   - pure CSS/DOM: no canvas, so it survives Next.js streaming and theme
 *     changes without re-paint jank.
 */

const WATERMARK_OPACITY = 0.045;

export default function ForensicWatermark() {
  const [identity, setIdentity] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!cancelled && user?.email) setIdentity(user.email);
      } catch {
        // No watermark before auth resolves; the proxy keeps unauthenticated
        // users off dashboard pages anyway.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Per-tab nonce so concurrent tabs of the same account remain separable.
  const nonce = useMemo(() => {
    if (typeof window === "undefined") return "";
    try {
      let stored = window.sessionStorage.getItem("4ol_wm_nonce");
      if (!stored) {
        stored = Math.random().toString(36).slice(2, 10);
        window.sessionStorage.setItem("4ol_wm_nonce", stored);
      }
      return stored;
    } catch {
      return Math.random().toString(36).slice(2, 10);
    }
  }, []);

  if (!identity) return null;

  const stamp = `${identity} • ${nonce} • ${new Date().toISOString().slice(0, 10)}`;
  // 6 rows x 3 columns is enough coverage that cropping a screenshot to any
  // practical region still keeps at least one full stamp in frame.
  const rows = Array.from({ length: 6 });
  const cols = Array.from({ length: 3 });

  return (
    <div
      aria-hidden
      data-ak="forensic-watermark"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        overflow: "hidden",
        opacity: WATERMARK_OPACITY,
        userSelect: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "-20%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-around",
          transform: "rotate(-24deg)",
        }}
      >
        {rows.map((_, r) => (
          <div
            key={r}
            style={{
              display: "flex",
              justifyContent: "space-around",
              marginLeft: r % 2 === 0 ? 0 : "8%",
            }}
          >
            {cols.map((__, c) => (
              <span
                key={c}
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  whiteSpace: "nowrap",
                  color: "#0f172a",
                }}
              >
                {stamp}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
