import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/admin";


import { getRequestUser } from "@/lib/mobile-auth";
import { normalizeGroupCategory } from "@/features/chat/schema/constants";
import {
  decideJoin,
  type CallerFacts,
} from "@/features/chat/lib/join-eligibility";

/**
 * GET /api/chat/conversations
 *
 * Fetches the conversation list for the authenticated user.
 *
 * FIX: Previously used auth.api.getSession() (BetterAuth) which returned null.
 * Also: session.user.id was a BetterAuth text ID, but get_conversations RPC
 * expects a UUID — caused "operator does not exist: uuid = text" 500 error.
 * The JWT's `sub` claim is a real UUID from auth.users, which is what the
 * RPC needs. (Identity now comes from @/lib/mobile-auth, verified in-process.)
 *
 * Query params:
 *   include_public=true  — append the public group DIRECTORY (AF-05 Part 3):
 *                          every active group with visibility='public' that the
 *                          user has NOT joined, each carrying a server-computed
 *                          `access_state` ('joinable' | 'locked') + `lock_reason`
 *                          ('invitation' | 'qualification' | 'full'). A locked
 *                          group is still listed (name, avatar, member_count) so
 *                          the user can see it exists, but its description/rules
 *                          are withheld and mobile shows "Accessible only by
 *                          invitation/qualification" instead of opening it.
 *                          Private groups (visibility='private', Super-Admin
 *                          switch) are never listed — members only. The user's
 *                          own groups come first (from get_conversations); the
 *                          directory is ordered by member_count desc.
 */
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getAdminClient();
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
  admin: ReturnType<typeof getAdminClient>,
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
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
  conversations: any[],
): Promise<any[]> {
  // IDs of groups the user is already part of. Those come from get_conversations
  // above (pinned to the top there), so Discover only returns groups the user
  // has NOT joined.
  const joinedGroupIds = new Set(
    conversations.filter((c) => c.type === "group").map((c) => c.id),
  );

  // Is this user a verified HCP? Needed to classify verified-only groups as
  // joinable vs locked (qualification).
  const { data: verification, error: verificationError } = await admin
    .from("hcp_verifications")
    .select("id")
    .eq("user_id", userId)
    .eq("verification_status", "verified")
    .limit(1)
    .maybeSingle();
  if (verificationError) throw verificationError;
  const isVerifiedHcp = !!verification;

  // Which facility-linked conversations does this user own? Needed to classify
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

  // AF-05 Part 3 + G2: list EVERY active group the Super Admin has left
  // `visibility='public'`, regardless of category or group_type. Eligibility no
  // longer filters a group OUT of the directory — it decides whether the row is
  // `joinable` or `locked` (with a machine-readable lock_reason), so a user can
  // see that a group exists and how many members it has even when they cannot
  // open it ("Accessible only by invitation/qualification"). PRIVATE groups
  // (visibility='private') are excluded entirely — members only.
  //
  // G2: there is no category allow-list here anymore. The E-D4 vocabulary is
  // normalised on the way out via normalizeGroupCategory, and decideJoin already
  // accepts both the legacy and E-D4 category values.
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
      group_type,
      group_rules,
      is_verified_only,
      visibility,
      max_members,
      created_by,
      created_at,
      updated_at,
      conversation_members(count)
      `,
    )
    .eq("type", "group")
    .eq("is_deleted", false)
    .eq("status", "active")
    .in("visibility", ["public", "restricted"])
    .order("created_at", { ascending: false })
    .limit(100);

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

      // Facts are precomputed above (one verification lookup + one facility
      // lookup for the whole list), so this stays O(1) per group — no N+1.
      const facts: CallerFacts = {
        isVerifiedHcp,
        ownsLinkedFacility: ownedFacilityConversationIds.has(g.id),
      };
      const decision = decideJoin(g as any, facts);

      let accessState: "joinable" | "locked";
      let lockReason: string | null = null;
      if (memberCount >= maxMembers) {
        accessState = "locked";
        lockReason = "full";
      } else if (decision.ok) {
        accessState = "joinable";
      } else {
        accessState = "locked";
        lockReason = decision.code;
      }
      const isLocked = accessState === "locked";

      return {
        id: g.id,
        type: "group",
        name: g.name || "Unnamed Group",
        // Withhold description/rules for locked rows: the directory reveals that
        // the group exists and its size, not its contents.
        description: isLocked ? null : g.description,
        group_rules: isLocked ? null : (g.group_rules ?? null),
        avatar_url: g.avatar_url,
        group_category: normalizeGroupCategory(g.group_category),
        group_category_raw: g.group_category,
        group_type: g.group_type,
        is_verified_only: g.is_verified_only,
        visibility: g.visibility ?? "public",
        max_members: maxMembers,
        member_count: memberCount,
        is_public_group: true,
        is_joined: false,
        // AF-05 Part 3 access model — mobile renders a lock badge + toast for
        // locked rows and a Join button for joinable ones.
        access_state: accessState,
        lock_reason: lockReason,
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
    .filter(Boolean)
    // Own groups already come first from get_conversations; order the public
    // directory by popularity so the largest communities surface first.
    .sort((a: any, b: any) => (b.member_count ?? 0) - (a.member_count ?? 0));
}
