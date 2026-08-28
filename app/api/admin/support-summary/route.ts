/**
 * GET /api/admin/support-summary — counts + previews for the top-nav
 * message icon.
 *
 * Surfaces the two queues an admin is actually expected to act on:
 *   - `chat_support` tickets that are open or in progress,
 *   - `content_moderation_flags` still pending review.
 *
 * Gated on `chats.view` (the same key the /chats console uses) because this
 * returns real ticket subjects and reporter-supplied text, not just numbers.
 * Callers without it get 403 and the icon hides itself.
 */

import { NextResponse } from "next/server";
import {
  adminAuthErrorResponse,
  requireAdminApiUser,
} from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * `chat_support.status` is stored capitalised ("Open", "Escalated",
 * "Resolved") — an allow-list of lowercase values matches zero rows. The
 * SupportTab defines an open ticket as `status !== "Resolved"`, so the same
 * negative filter is used here; it also survives any new status being added.
 */
const RESOLVED_STATUS = "Resolved";

/**
 * `content_moderation_flags.status` is the `moderation_status` enum:
 * pending_review | approved | rejected | flagged | escalated | auto_moderated.
 * There is no "pending" member. These three are the ones still awaiting a
 * human decision (FlaggedTab gates its actions on pending_review).
 */
const OUTSTANDING_FLAG_STATUSES = ["pending_review", "flagged", "escalated"];

const PREVIEW_LIMIT = 5;

export async function GET() {
  const auth = await requireAdminApiUser("chats.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();

  const [ticketCount, unassignedCount, flagCount, recentTickets] =
    await Promise.all([
      admin
        .from("chat_support")
        .select("id", { count: "exact", head: true })
        .neq("status", RESOLVED_STATUS)
        .eq("is_deleted", false),
      admin
        .from("chat_support")
        .select("id", { count: "exact", head: true })
        .neq("status", RESOLVED_STATUS)
        .eq("is_deleted", false)
        .is("assigned_to", null),
      admin
        .from("content_moderation_flags")
        .select("id", { count: "exact", head: true })
        .in("status", OUTSTANDING_FLAG_STATUSES),
      admin
        .from("chat_support")
        .select("id, subject, user_name, priority, status, created_at")
        .neq("status", RESOLVED_STATUS)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(PREVIEW_LIMIT),
    ]);

  if (recentTickets.error) {
    return NextResponse.json(
      { error: recentTickets.error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    openTickets: ticketCount.count ?? 0,
    unassignedTickets: unassignedCount.count ?? 0,
    pendingFlags: flagCount.count ?? 0,
    // Drives the badge; flags are included because both queues live behind
    // the same icon in the mockup.
    total: (ticketCount.count ?? 0) + (flagCount.count ?? 0),
    recent: recentTickets.data ?? [],
  });
}
