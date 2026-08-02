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
 * GET /api/chat/conversations
 *
 * Fetches the conversation list for the authenticated user.
 *
 * FIX: Previously used auth.api.getSession() (BetterAuth) which returned null.
 * Also: session.user.id was a BetterAuth text ID, but get_conversations RPC
 * expects a UUID — caused "operator does not exist: uuid = text" 500 error.
 * admin.auth.getUser() returns a real UUID from auth.users.
 *
 * Query params:
 *   include_public=true  — also include groups the user is not yet a member
 *                          of that they're eligible to discover/join, per
 *                          category:
 *                            general/specialty/support/announcements — open
 *                              to everyone
 *                            facility  — only shown to the owner of the
 *                              linked facility (no facility-staff/membership
 *                              table exists yet, so ownership is the only
 *                              signal available)
 *                            is_verified_only groups — only shown to users
 *                              with an approved hcp_verifications row
 *                          Groups already at max_members are excluded either
 *                          way.
 */
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdmin();
    const includePublic =
      req.nextUrl.searchParams.get("include_public") === "true";

    const { data: memberConversations, error } = await admin.rpc(
      "get_conversations",
      {
        p_user_id: user.id, // ← native UUID — no more type mismatch
        p_limit: 50,
      },
    );

    if (error) {
      console.error("[chat/conversations] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const conversations = (memberConversations || []) as any[];

    if (!includePublic) {
      return NextResponse.json(conversations);
    }

    // The "discover" section below does 4 sequential Supabase round trips
    // on top of the RPC above. On a cold serverless invocation (the very
    // first request after the app launches — exactly when the Messages
    // tab is opened for the first time) any one of those can transiently
    // fail before the function/connection has warmed up. That used to be
    // swallowed silently: `publicError` just returned the member-only
    // `conversations` list as if it were a complete, successful response —
    // so the client's built-in retry (react-query's `retry: 2`) never had
    // anything to retry against, and the Discover section would just stay
    // empty until the user pulled to refresh and got lucky on a warm
    // instance. `fetchDiscoverGroups` retries a couple of times in-process
    // first (fast, invisible to the user); only if it's still failing
    // after that do we degrade to member-only, and we do it via retryable
    // fetchDiscoverGroups() below rather than reaching into `publicError`
    // directly so every step gets the same retry treatment.
    const discoverGroups = await fetchDiscoverGroups(admin, user.id, conversations);

    return NextResponse.json([...conversations, ...discoverGroups]);
  } catch (err: any) {
    console.error("[chat/conversations] error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Runs the "discover" eligibility lookups + public-groups query, retrying
 * the whole block a couple of times on transient failure before giving up.
 * Isolated from the main handler so a blip here degrades gracefully
 * (empty array) instead of taking down the member-conversations response
 * it's appended to.
 */
async function fetchDiscoverGroups(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  conversations: any[],
): Promise<any[]> {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fetchDiscoverGroupsOnce(admin, userId, conversations);
    } catch (err: any) {
      const isLastAttempt = attempt === MAX_ATTEMPTS;
      console.error(
        `[chat/conversations] discover groups attempt ${attempt}/${MAX_ATTEMPTS} failed:`,
        err?.message ?? err,
      );
      if (isLastAttempt) {
        // Degrade gracefully rather than failing the whole conversations
        // request over a discover-only problem.
        return [];
      }
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
  }

  return [];
}

async function fetchDiscoverGroupsOnce(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  conversations: any[],
): Promise<any[]> {
  // IDs of groups the user is already part of
  const joinedGroupIds = new Set(
    conversations.filter((c) => c.type === "group").map((c) => c.id),
  );

  // Categories that are open to everyone (no extra eligibility check).
  const OPEN_CATEGORIES = ["general", "specialty", "support", "announcements"];

  // Is this user a verified HCP? Needed to gate is_verified_only groups.
  const { data: verification, error: verificationError } = await admin
    .from("hcp_verifications")
    .select("id")
    .eq("user_id", userId)
    .eq("verification_status", "verified")
    .limit(1)
    .maybeSingle();
  if (verificationError) throw verificationError;
  const isVerifiedHcp = !!verification;

  // Which facilities (if any) does this user own? Needed to gate
  // "facility" category groups.
  const { data: ownedFacilities, error: ownedFacilitiesError } = await admin
    .from("facility_profile")
    .select("id")
    .eq("owner_id", userId);
  if (ownedFacilitiesError) throw ownedFacilitiesError;
  const ownedFacilityIds = (ownedFacilities || []).map((f: any) => f.id);

  let ownedFacilityConversationIds = new Set<string>();
  if (ownedFacilityIds.length > 0) {
    const { data: facilityConvos, error: facilityConvosError } = await admin
      .from("facility_conversations")
      .select("conversation_id, facility_id")
      .in("facility_id", ownedFacilityIds);
    if (facilityConvosError) throw facilityConvosError;
    ownedFacilityConversationIds = new Set(
      (facilityConvos || []).map((fc: any) => fc.conversation_id),
    );
  }

  // Fetch every discoverable group category in one query; eligibility
  // filtering (verified-only, facility ownership) happens below since it
  // needs cross-table lookups above.
  let publicQuery = admin
    .from("conversations")
    .select(
      `
      id,
      type,
      name,
      description,
      avatar_url,
      group_category,
      is_verified_only,
      max_members,
      created_by,
      created_at,
      updated_at,
      conversation_members(count)
      `,
    )
    .eq("type", "group")
    .eq("is_deleted", false)
    .in("group_category", [...OPEN_CATEGORIES, "facility"])
    .order("created_at", { ascending: false })
    .limit(50);

  if (joinedGroupIds.size > 0) {
    publicQuery = publicQuery.not(
      "id",
      "in",
      `(${Array.from(joinedGroupIds).join(",")})`,
    );
  }

  const { data: publicGroups, error: publicError } = await publicQuery;
  if (publicError) throw publicError;

  return (publicGroups || [])
    .map((g: any) => {
      const memberCount = g.conversation_members?.[0]?.count ?? 0;
      const maxMembers = g.max_members ?? 500;

      // Skip full groups
      if (memberCount >= maxMembers) return null;

      // Verified-HCPs-only groups: hide from anyone who isn't verified.
      if (g.is_verified_only && !isVerifiedHcp) return null;

      // Facility groups: only discoverable by that facility's owner.
      if (
        g.group_category === "facility" &&
        !ownedFacilityConversationIds.has(g.id)
      ) {
        return null;
      }

      return {
        id: g.id,
        type: "group",
        name: g.name || "Unnamed Group",
        description: g.description,
        avatar_url: g.avatar_url,
        group_category: g.group_category,
        is_verified_only: g.is_verified_only,
        max_members: maxMembers,
        member_count: memberCount,
        is_public_group: true,
        is_joined: false,
        members: [],
        last_message_at: null,
        last_message_preview: null,
        unread_count: 0,
        is_archived: false,
        created_by: g.created_by,
        created_at: g.created_at,
        updated_at: g.updated_at,
      };
    })
    .filter(Boolean);
}
