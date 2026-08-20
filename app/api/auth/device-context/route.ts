import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/auth/device-context
 *
 * Returns the caller's IP and a coarse "City, Country" label, used by the
 * mobile app's device sign-in approval prompt ("Pixel 8 is trying to sign in
 * from Accra, Ghana").
 *
 * This lives server-side because only the server sees the request IP. The
 * alternative — asking the signing-in device for GPS — would mean prompting
 * for location permission on a device that hasn't been approved yet.
 *
 * Best-effort by design: every field can come back null, and the prompt simply
 * omits the location line. Nothing here may block a sign-in.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);

  if (error || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // x-forwarded-for is a comma-separated chain; the client is the first entry.
  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    null;

  // Vercel injects these at the edge. On other hosts they're absent and the
  // label degrades to null rather than to a wrong guess.
  const city = req.headers.get("x-vercel-ip-city");
  const country = req.headers.get("x-vercel-ip-country");

  const parts = [
    city ? decodeURIComponent(city) : null,
    country ? decodeURIComponent(country) : null,
  ].filter(Boolean);

  return NextResponse.json({
    ip,
    location_label: parts.length ? parts.join(", ") : null,
  });
}
