import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/admin";

import { getRequestUser } from "@/lib/mobile-auth";

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
export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user?.id || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();

  const body = await request.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason : "";

  const { data: existing, error: existingError } = await admin
    .from("delete_account_requests")
    .select("id, status")
    .eq("user_id", user.id)
    // Any non-terminal status counts as "already has a request in
    // flight" — not just pending_review. completed/cancelled are
    // terminal, so a new request is allowed after either of those.
    .in("status", ["pending_review", "in_verification", "grace_period"])
    .maybeSingle();

  if (existingError) {
    console.error("[delete-account-request] Failed to check for existing request:", existingError.message);
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }

  // Already has an in-flight request — don't create a duplicate row.
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
        status: "pending_review",
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

/**
 * GET /api/user/delete-account-request
 *
 * Gap Analysis Part AI (MA-D3): the mobile Delete Account screen needs to
 * show the status of an in-flight request on revisit (pending banner +
 * cancel option). Returns the caller's most recent request, or null.
 */
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();

  const { data, error } = await admin
    .from("delete_account_requests")
    .select("id, status, reason, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[delete-account-request] GET failed:", error.message);
    return NextResponse.json({ error: "Failed to load request status" }, { status: 500 });
  }

  return NextResponse.json({ request: data ?? null });
}

/**
 * PATCH /api/user/delete-account-request
 *
 * Gap Analysis Part AI (MA-D3): lets the caller cancel their own request
 * while it is still in flight. Only non-terminal statuses are cancellable;
 * grace_period/completed requests are owned by the admin lifecycle and
 * cannot be withdrawn from the app.
 *
 * Body: { action: "cancel" }
 */
export async function PATCH(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();

  const body = await request.json().catch(() => ({}));
  if (body?.action !== "cancel") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const { data: existing, error: findError } = await admin
    .from("delete_account_requests")
    .select("id, status")
    .eq("user_id", user.id)
    .in("status", ["pending_review", "in_verification"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    console.error("[delete-account-request] cancel lookup failed:", findError.message);
    return NextResponse.json({ error: "Failed to cancel request" }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json(
      { error: "No cancellable deletion request found" },
      { status: 404 },
    );
  }

  const { error: updateError } = await admin
    .from("delete_account_requests")
    .update({ status: "cancelled" })
    .eq("id", existing.id);

  if (updateError) {
    console.error("[delete-account-request] cancel failed:", updateError.message);
    return NextResponse.json({ error: "Failed to cancel request" }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: existing.id, status: "cancelled" });
}
