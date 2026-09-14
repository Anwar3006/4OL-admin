import { NextResponse } from "next/server";

import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const DEFAULT_TIMEOUT_MINUTES = 60;
const MIN_TIMEOUT_MINUTES = 5;
const MAX_TIMEOUT_MINUTES = 720;

/**
 * Minimal policy endpoint used by every signed-in admin.
 *
 * The full security settings route requires settings.security permission.
 * Idle enforcement applies to every admin, so this route reveals only the
 * timeout and requires a valid admin session without exposing the rest of the
 * platform security configuration.
 */
export async function GET() {
  const auth = await requireAdminApiUser();
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("platform_settings")
    .select("security_settings")
    .eq("id", "global")
    .maybeSingle();

  if (error) {
    console.error("[admin/session-policy] load failed:", error.message);
    return NextResponse.json(
      { sessionTimeoutMinutes: DEFAULT_TIMEOUT_MINUTES, source: "fallback" },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const settings = data?.security_settings as
    | { session_timeout_mins?: unknown }
    | null
    | undefined;
  const configured = Number(settings?.session_timeout_mins);
  const sessionTimeoutMinutes = Number.isInteger(configured)
    ? Math.min(MAX_TIMEOUT_MINUTES, Math.max(MIN_TIMEOUT_MINUTES, configured))
    : DEFAULT_TIMEOUT_MINUTES;

  return NextResponse.json(
    {
      sessionTimeoutMinutes,
      source: Number.isInteger(configured) ? "saved" : "default",
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
