import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/admin";
import { getRequestUser, lastAuthTiming } from "@/lib/mobile-auth";

/**
 * The local `getRequestUser` that used to live here called
 * `admin.auth.getUser(token)` — a network round trip to GoTrue on every
 * request, before the query this route actually exists to run.
 *
 * `@/lib/mobile-auth` verifies the JWT signature in-process instead. Same
 * guarantee, no round trip. See that module for the rollover behaviour while
 * legacy HS256 tokens are still in circulation.
 *
 * ── Why this route is instrumented ──────────────────────────────────────
 *
 * The 13 Sept load test measured p50 327 ms but p99 6,849 ms through Vercel,
 * while Supabase's own origin latency stayed flat at ~230 ms throughout. So
 * the tail is being added somewhere between the client and Supabase, and from
 * the outside there is no way to tell a cold start from a slow JWKS fetch from
 * a slow query.
 *
 * `Server-Timing` splits it. Read it in the browser devtools network panel, or
 * with `curl -sSD - -o /dev/null`. It costs a few bytes per response and
 * removes the guesswork; delete it once the tail is understood.
 *
 *   auth;dur=4       verification, in-process (good)
 *   auth;dur=240     verification went to the network — cold JWKS or HS256 token
 *   db;dur=8         the actual query
 *   total;dur=260    everything this handler did
 *
 * If auth and db are both small but the client still saw seconds, the time is
 * Vercel's — cold start or queueing — and no code change here will fix it.
 */

/** Build a Server-Timing header from the pieces we can measure. */
function timing(totalMs: number, dbMs: number) {
  return [
    `auth;dur=${lastAuthTiming.ms};desc="${lastAuthTiming.path}"`,
    `db;dur=${dbMs}`,
    `total;dur=${totalMs}`,
  ].join(", ");
}

/**
 * GET /api/user/profile
 * Returns the authenticated user's full profile.
 */
export async function GET(req: NextRequest) {
  const t0 = Date.now();

  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdminClient();
  const dbStart = Date.now();
  const { data, error } = await admin
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  const dbMs = Date.now() - dbStart;

  if (error) {
    console.error("[user-profile GET] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // user_metadata is Record<string, unknown>, so narrow before use — the old
  // code got `any` from the Supabase user object and never had to.
  const metadataAvatar =
    typeof user.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null;

  const profile = data
    ? {
        ...data,
        email: user.email ?? null,
        avatar_url: data.avatar_url ?? metadataAvatar,
      }
    : null;

  return NextResponse.json(profile, {
    headers: { "Server-Timing": timing(Date.now() - t0, dbMs) },
  });
}

/**
 * PATCH /api/user/profile
 * Updates the authenticated user's profile fields.
 */
export async function PATCH(req: NextRequest) {
  const t0 = Date.now();

  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { user_id: _ignored, avatar_url: _avatar, ...fields } = body;

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const admin = getAdminClient();
  const dbStart = Date.now();
  const { data, error } = await admin
    .from("user_profiles")
    .update(fields)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();
  const dbMs = Date.now() - dbStart;

  if (error) {
    console.error("[user-profile PATCH] Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { data },
    { headers: { "Server-Timing": timing(Date.now() - t0, dbMs) } },
  );
}
