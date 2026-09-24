import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/admin";


import { getRequestUser } from "@/lib/mobile-auth";

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

    const admin = getAdminClient();

    // ── Authorisation ───────────────────────────────────────────────
    // Service-role client, so nothing below RLS protects this route. The
    // mobile client already sends only safe values (CreateGroupModal: type
    // 'open', members = [creator]); this makes the server enforce what the
    // client only promises. Platform admins are exempt.
    //
    // NOT decided here: who may create a group at all. The client's create
    // FAB is commented out pending that product call (ChatsScreenContent.tsx),
    // so this route is currently reachable only by hand or by an old build.
    const { data: profile } = await admin
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    const isPlatformAdmin =
      profile?.role === "admin" || profile?.role === "super_admin";

    if (!isPlatformAdmin) {
      const others = (Array.isArray(memberIds) ? memberIds : []).filter(
        (m: string) => m !== user.id,
      );
      if (others.length > 0) {
        return NextResponse.json(
          { error: "You can't add other people when creating a group." },
          { status: 403 },
        );
      }

      // Restricted types (verified / hcp_verified / premium / admin) are
      // admin-only; user-created groups are always 'open'.
      if (group_type && group_type !== "open") {
        return NextResponse.json(
          { error: "Only admins can create restricted groups." },
          { status: 403 },
        );
      }

      // Admin-only category (see CreateGroupModal.GROUP_CATEGORY_OPTIONS).
      if (group_category === "bedtracker_emergency") {
        return NextResponse.json(
          { error: "Only admins can create this kind of group." },
          { status: 403 },
        );
      }

      // Linking a group to a facility requires owning it. Same ownership
      // signal Discover uses (no facility-staff check until P1-08 reaches chat).
      if (facilityId) {
        const { data: owned } = await admin
          .from("facility_profile")
          .select("id")
          .eq("id", facilityId)
          .eq("owner_id", user.id)
          .maybeSingle();
        if (!owned) {
          return NextResponse.json(
            { error: "You can only create groups for a facility you own." },
            { status: 403 },
          );
        }
      }
    }

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
