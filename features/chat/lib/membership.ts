import type { getAdminClient } from "@/lib/db/admin";

type Admin = ReturnType<typeof getAdminClient>;

/**
 * Conversation membership checks for the /api/chat/* routes.
 *
 * Those routes use the service-role client, which bypasses RLS, so the chat
 * RLS policies protect nothing on this path — these checks ARE the
 * authorisation. They mirror the database helpers `is_conversation_member()`
 * and `user_can_manage_conversation()`; keep them in step.
 */

/**
 * Roles that may manage a conversation (add / remove other members, invite,
 * approve joins, delete any message, set the group image).
 *
 * AF-05 D1: the canonical manager vocabulary is `owner` + `moderator`.
 * `admin` and `group_leader` are LEGACY aliases kept only for the expand/
 * contract transition window (old rows / in-flight old builds); the
 * 20260927000200_af05_role_normalisation migration rewrites existing data to
 * `moderator`, and the CONTRACT follow-up drops the legacy values once no build
 * writes them. Keep this list in step with `user_can_manage_conversation()`.
 *
 * Module-private on purpose: callers should ask `isManagerRole()` rather than
 * re-implement the comparison, so there is one definition of "can manage".
 */
const CONVERSATION_MANAGER_ROLES: readonly string[] = [
  "owner",
  "moderator",
  // Legacy aliases (transition only — see above):
  "admin",
  "group_leader",
];

/**
 * The caller's role in the conversation, or null if they are not a live
 * (not left) member. A live member whose role is somehow null counts as a
 * plain "member".
 */
export async function getLiveMemberRole(
  admin: Admin,
  conversationId: string,
  userId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from("conversation_members")
    .select("role")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .is("left_at", null)
    .maybeSingle();

  if (error || !data) return null;
  return data.role ?? "member";
}

export async function isLiveMember(
  admin: Admin,
  conversationId: string,
  userId: string,
): Promise<boolean> {
  return (await getLiveMemberRole(admin, conversationId, userId)) !== null;
}

export function isManagerRole(role: string | null): boolean {
  return role !== null && CONVERSATION_MANAGER_ROLES.includes(role);
}
