import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * POST /api/user/delete-account-request
 *
 * Creates a delete_account_requests row for the AUTHENTICATED caller.
 * Previously trusted a client-supplied `userId`/`email` with no auth check
 * at all — anyone could POST an arbitrary userId and create a deletion
 * request against someone else's account. Now validates the caller via
 * Supabase Auth JWT (Bearer token), matching the pattern used by
 * /api/user/push-token and /api/chat/messages, and derives user_id/email
 * server-side instead of trusting the request body for either.
 *
 * Body: { reason?: string }
 */
export async function POST(request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user?.id || !user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason : "";

  const { data: existing, error: existingError } = await admin
    .from("delete_account_requests")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existingError) {
    console.error("[delete-account-request] Failed to check for existing request:", existingError.message);
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }

  // Already has a pending request — don't create a duplicate row.
  if (existing) {
    return NextResponse.json({ success: true, id: existing.id, alreadyPending: true });
  }

  const { data, error } = await admin
    .from("delete_account_requests")
    .insert([
      {
        user_id: user.id,
        email: user.email,
        reason,
        status: "pending",
      },
    ])
    .select("id")
    .single();

  if (error) {
    console.error("[delete-account-request] Failed to insert:", error.message);
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: data.id });
}
