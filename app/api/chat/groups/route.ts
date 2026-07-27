import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function getRequestUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;
  const admin = getSupabaseAdmin();
  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);
  if (error || !user?.id) return null;
  return user;
}

/**
 * POST /api/chat/groups
 *
 * Creates a group conversation.
 */
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, description, memberIds, avatar_url, facilityId } =
      await req.json();

    const admin = getSupabaseAdmin();

    // Call the RPC function via admin client
    const { data, error } = await admin.rpc("fn_create_group_conversation", {
      p_name: name,
      p_description: description || null,
      p_created_by: user.id,
      p_member_ids: memberIds || [],
      p_avatar_url: avatar_url || null,
      p_facility_id: facilityId || null,
    });

    if (error) {
      console.error("[chat/groups] RPC error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
