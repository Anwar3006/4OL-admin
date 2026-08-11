import { NextResponse } from "next/server";

/**
 * POST /api/delete-user
 *
 * NOT IMPLEMENTED. This route previously proxied to an edge function on a
 * different (now-inactive) Supabase project ref and was fully commented out
 * — meaning any client still calling it was silently getting a 404 rather
 * than a clear error.
 *
 * The real, working account-deletion flow is request-then-review:
 *   1. Client calls POST /api/user/delete-account-request, which inserts a
 *      row into `delete_account_requests` (status: "pending").
 *   2. An admin reviews and actions it from the dashboard
 *      (app/(dashboard)/delete-account-request).
 *
 * This matches a GDPR-style deletion flow that goes through human review
 * rather than an instant, unauthenticated self-service hard-delete — which
 * is what this route would need to safely become if ever wired up for real
 * (verify caller identity, cascade-delete or anonymize across every
 * user-owned table, and log the action).
 *
 * Tracked follow-up: TASKS.md Epic 1.6.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Not implemented",
      message:
        "Use POST /api/user/delete-account-request to submit an account deletion request for admin review.",
    },
    { status: 501 },
  );
}
