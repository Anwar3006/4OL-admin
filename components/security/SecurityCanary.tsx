"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

/**
 * Part AK (AK-D7) — DOM canary token.
 *
 * Fetches the session's dashboard canary (issue_canary RPC, migration
 * 20260822_anti_screen_reading_ak.sql) and renders it in an invisible,
 * zero-box span. Automated DOM scrapers — including AI agents that dump
 * innerText or accessibility trees — pick the token up alongside real
 * content; humans never see it. When a leak surfaces, feeding the token to
 * report_canary_hit() names the exact admin session it was issued to.
 *
 * The same token family is also embedded in API JSON payloads (see
 * lib/security-audit.ts issueCanaryFor wiring in /api/admin/users), so
 * both the screen-scrape and the network-scrape paths are attributable.
 *
 * Fail-open: before the migration is applied the RPC rejects and the
 * component renders nothing.
 */
export default function SecurityCanary() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.rpc("issue_canary", {
          p_context: "dashboard_dom",
        });
        if (!cancelled && !error && typeof data === "string") {
          setToken(data);
        }
      } catch {
        // Migration not applied — canaries activate once it is.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!token) return null;

  return (
    <span
      aria-hidden
      data-ak="canary"
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        overflow: "hidden",
        opacity: 0,
        fontSize: 0,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      {`4OL-CANARY:${token}`}
    </span>
  );
}
