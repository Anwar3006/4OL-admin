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
    const {
      name,
      description,
      memberIds,
      avatar_url,
      facilityId,
      // Gap Analysis CH-D5 — alignment fields so mobile-created groups
      // carry the same metadata as admin-created ones.
      group_category,
      group_type,
      group_permissions,
      group_rules,
    } = await req.json();

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

    // CH-D5: the RPC predates the group-enrichment columns, so apply them
    // as a follow-up update. Columns may not exist until the chat schema
    // capture migration is applied — ignore that specific failure so group
    // creation itself never breaks.
    if (data) {
      const enrichment: Record<string, unknown> = {};
      if (group_category) enrichment.group_category = group_category;
      if (group_type) enrichment.group_type = group_type;
      if (group_permissions && typeof group_permissions === "object") {
        enrichment.group_permissions = group_permissions;
      }
      if (group_rules) enrichment.group_rules = group_rules;

      if (Object.keys(enrichment).length > 0) {
        const { error: enrichError } = await admin
          .from("conversations")
          .update(enrichment)
          .eq("id", data);
        if (enrichError) {
          console.warn(
            "[chat/groups] enrichment update failed (non-fatal):",
            enrichError.message,
          );
        }
      }
    }

    return NextResponse.json({ id: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
