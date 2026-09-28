import { NextRequest, NextResponse } from "next/server";

import { getAdminClient } from "@/lib/db/admin";
import { getRequestUser } from "@/lib/mobile-auth";
import { isLiveMember } from "@/features/chat/lib/membership";

/**
 * GET /api/chat/member-search?conversation_id=...&q=...
 *
 * A live group member may search names to choose a person for an invite or
 * an add-member request. Never return email, phone, role, or arbitrary
 * profile fields from this discovery surface.
 */
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversationId = req.nextUrl.searchParams.get("conversation_id")?.trim();
  const query = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!conversationId) {
    return NextResponse.json(
      { error: "conversation_id is required" },
      { status: 400 },
    );
  }
  if (query.length < 2 || query.length > 60 || !/^[\p{L}\p{N} .'-]+$/u.test(query)) {
    return NextResponse.json(
      { error: "Enter at least two letters of the person's name." },
      { status: 400 },
    );
  }

  try {
    const admin = getAdminClient();
    if (!(await isLiveMember(admin, conversationId, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [{ data: profiles, error: profilesError }, { data: members, error: membersError }] =
      await Promise.all([
        admin
          .from("user_profiles")
          .select("user_id, first_name, last_name, avatar_url")
          .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
          .neq("user_id", user.id)
          .limit(20),
        admin
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", conversationId)
          .is("left_at", null),
      ]);

    if (profilesError) throw profilesError;
    if (membersError) throw membersError;

    const existingMemberIds = new Set((members ?? []).map((member) => member.user_id));
    return NextResponse.json(
      (profiles ?? []).filter((profile) => !existingMemberIds.has(profile.user_id)),
    );
  } catch (err: any) {
    console.error("[chat/member-search] error:", err?.message ?? err);
    return NextResponse.json(
      { error: "Unable to search members right now." },
      { status: 500 },
    );
  }
}
