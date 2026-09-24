import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/admin";


import { getRequestUser } from "@/lib/mobile-auth";
import { decideJoin, loadCallerFacts } from "@/features/chat/lib/join-eligibility";
import {
  getLiveMemberRole,
  isLiveMember,
  isManagerRole,
} from "@/features/chat/lib/membership";

/**
 * GET /api/chat/members?conversation_id=XYZ
 *
 * Fetches members of a conversation.
 */
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const conversation_id = searchParams.get("conversation_id");

  if (!conversation_id) {
    return NextResponse.json(
      { error: "conversation_id is required" },
      { status: 400 },
    );
  }

  try {
    const admin = getAdminClient();

    // Only members may see who else is in a conversation.
    if (!(await isLiveMember(admin, conversation_id, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await admin
      .from("conversation_members")
      .select(
        `
        user_id,
        role,
        joined_at,
        user_profiles:user_id (
          first_name,
          last_name,
          role
        )
      `,
      )
      .eq("conversation_id", conversation_id)
      .is("left_at", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/chat/members
 *
 * Joins a conversation.
 */
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { conversation_id } = await req.json();

    const admin = getAdminClient();

    // Enforce max_members at join time too — the discovery list already
    // hides full groups, but this closes the race where two users join a
    // group that has one slot left at the same moment.
    const { data: convo, error: convoError } = await admin
      .from("conversations")
      .select(
        "max_members, type, is_deleted, status, group_type, group_category, is_verified_only, conversation_members(count)",
      )
      .eq("id", conversation_id)
      .single();

    if (convoError) {
      return NextResponse.json({ error: convoError.message }, { status: 500 });
    }

    // Who may join: you can join what you could have discovered (see
    // features/chat/lib/join-eligibility.ts). Without this, anyone could add
    // themselves to a direct chat, a verified-only, facility or premium group
    // by id and then read it. Someone who is already a live member skips the
    // check, so nobody is locked out of a group they were legitimately added to.
    if (!(await isLiveMember(admin, conversation_id, user.id))) {
      const facts = await loadCallerFacts(admin, user.id, conversation_id, convo as any);
      const decision = decideJoin(convo as any, facts);
      if (!decision.ok) {
        return NextResponse.json({ error: decision.reason }, { status: 403 });
      }
    }

    const memberCount = (convo as any)?.conversation_members?.[0]?.count ?? 0;
    const maxMembers = convo?.max_members ?? 500;
    if (memberCount >= maxMembers) {
      return NextResponse.json(
        { error: "This group is full." },
        { status: 409 },
      );
    }

    const { data, error } = await admin
      .from("conversation_members")
      .insert({
        conversation_id,
        user_id: user.id,
        role: "member",
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Handle unique violation (already a member)
      if (error.code === "23505") {
        const { error: updateError } = await admin
          .from("conversation_members")
          .update({ left_at: null, joined_at: new Date().toISOString() })
          .eq("conversation_id", conversation_id)
          .eq("user_id", user.id);

        if (updateError)
          return NextResponse.json(
            { error: updateError.message },
            { status: 500 },
          );
        return NextResponse.json({ success: true, reJoined: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/chat/members
 *
 * Leaves or removes a member from a conversation.
 */
export async function PATCH(req: NextRequest) {
  const user = await getRequestUser(req);

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { conversation_id, user_id } = await req.json();

    const admin = getAdminClient();

    // If user_id is provided, it's a "remove member" action (requires admin check)
    // If not, it's a "leave" action (self)
    const targetUserId = user_id || user.id;

    if (user_id && user_id !== user.id) {
      // Removing someone else requires managing the conversation. Mirrors
      // `user_can_manage_conversation()` in the database.
      const actorRole = await getLiveMemberRole(admin, conversation_id, user.id);
      if (!isManagerRole(actorRole)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { error } = await admin
      .from("conversation_members")
      .update({ left_at: new Date().toISOString() })
      .eq("conversation_id", conversation_id)
      .eq("user_id", targetUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
