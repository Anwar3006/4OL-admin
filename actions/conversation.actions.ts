"use server";

import { getAdminClient } from "@/lib/db/admin";
import { getServerClient } from "@/lib/db/server";

/**
 * assignAdminWithRulesAction
 *
 * Server action that calls the fn_assign_admin_with_rules RPC, which
 * atomically in one Postgres transaction:
 *   1. Updates conversations.last_message_at and last_message_preview
 *   2. Inserts the Rules of Conduct as a system message in messages
 *   3. Inserts/updates the admin in conversation_members
 *
 * We use the admin (service_role) client so the server action can bypass
 * RLS without exposing the secret key to the browser. The caller's
 * Supabase session is validated before any write is made.
 */
export async function assignAdminWithRulesAction(
  conversation_id: string,
  user_id: string,
  facility_id: string,
  // AF-05 D1: canonical manager role is `moderator` (matches the
  // fn_assign_admin_with_rules default after the role-normalisation migration).
  role: string = "moderator",
): Promise<{ error: string | null }> {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const supabase = await getServerClient();
  const { data: { user: callerUser } } = await supabase.auth.getUser();

  if (!callerUser) {
    return { error: "Unauthorized" };
  }

  // ── Input validation ──────────────────────────────────────────────────────
  if (!conversation_id?.trim() || !user_id?.trim()) {
    return { error: "conversation_id and user_id are required" };
  }

  // ── RPC call ──────────────────────────────────────────────────────────────
  try {
    const admin = getAdminClient();

    const { error } = await admin.rpc("fn_assign_admin_with_rules", {
      p_conversation_id: conversation_id,
      p_user_id: user_id,
      p_role: role,
    });

    if (error) {
      console.error("[assignAdminWithRulesAction] RPC error:", error.message);
      return { error: error.message };
    }

    return { error: null };
  } catch (err: any) {
    console.error(
      "[assignAdminWithRulesAction] Unexpected error:",
      err.message,
    );
    return { error: err.message ?? "Unexpected server error" };
  }
}
