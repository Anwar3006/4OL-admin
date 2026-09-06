import { NextRequest, NextResponse } from "next/server";
import {
  adminAuthErrorResponse,
  getAdminApiContext,
  requireAdminApiUser,
} from "@/lib/admin-api-auth";
import { SUPER_ADMIN_ROLE } from "@/lib/admin-roles";
import { getAdminClient } from "@/lib/db/admin";

// Global Message Search (Gap Analysis Part E, decision E-D5) — cross-group
// message content is PHI, so this is super_admin only (role-checked, not
// just a permission key).
export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("chats.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const ctx = await getAdminApiContext();
  if (!ctx || ctx.role !== SUPER_ADMIN_ROLE) {
    return NextResponse.json(
      { error: "Global Message Search is restricted to Super Admins." },
      { status: 403 },
    );
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [], total: 0 });
  }

  const admin = getAdminClient();
  const { data, error, count } = await admin
    .from("messages")
    .select(
      `
      id,
      content,
      created_at,
      conversation_id,
      sender_id,
      conversations!inner (name, group_category),
      sender:user_profiles!sender_id (first_name, last_name)
      `,
      { count: "exact" },
    )
    .eq("is_deleted", false)
    .ilike("content", `%${q}%`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[chat/global-search] Supabase error:", error.message);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }

  // Audit the search — cross-group PHI access must be traceable.
  await admin.rpc("log_admin_activity", {
    p_admin_id: ctx.user.id,
    p_action_type: "global_message_search",
    p_target_table: "messages",
    p_record_id: null,
    p_description: `Global message search: "${q}" (${count ?? 0} hits)`,
    p_severity: "warning",
  });

  return NextResponse.json({
    results: (data ?? []).map((m: any) => ({
      id: m.id,
      content: m.content,
      createdAt: m.created_at,
      conversationId: m.conversation_id,
      conversationName: m.conversations?.name ?? "Unknown group",
      groupCategory: m.conversations?.group_category ?? null,
      senderName:
        [m.sender?.first_name, m.sender?.last_name].filter(Boolean).join(" ") ||
        "Unknown",
    })),
    total: count ?? 0,
  });
}
