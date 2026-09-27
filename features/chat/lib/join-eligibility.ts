import type { getAdminClient } from "@/lib/db/admin";

type Admin = ReturnType<typeof getAdminClient>;

/**
 * Who may join a group on their own, via POST /api/chat/members.
 *
 * That route uses the service-role client, so nothing in the database stops a
 * caller joining any conversation whose id they know. Before this module the
 * route only checked capacity. The rule here is "you can join what you could
 * have discovered", the same tiers `api/conversations.ts` applies when it
 * builds the Discover list:
 *
 *   - direct chats, deleted and non-active groups are never joinable
 *   - `premium` and `admin` group types are never self-joinable (a paid-group
 *     entitlement path comes with P2-04)
 *   - verified-only groups need an approved `hcp_verifications` row
 *   - facility groups are joinable only by the owner of the linked facility
 *   - everything else must be in a category open to all
 *
 * Fail-closed: an unknown or missing category is NOT joinable.
 *
 * KNOWN DRIFT: `api/conversations.ts` still filters Discover by the LEGACY
 * categories only (general / specialty / support / announcements) while
 * schema/constants.ts moved to the E-D4 vocabulary. This list accepts both,
 * because live rows carry the legacy values and new groups carry the new
 * ones. If Discover is updated to the new vocabulary, this list already
 * covers it.
 */

/** Categories any signed-in user may join. `facility` and
 *  `bedtracker_emergency` are deliberately absent. */
export const SELF_JOINABLE_CATEGORIES: readonly string[] = [
  // Legacy vocabulary (pre E-D4) — still on existing rows.
  "general",
  "specialty",
  "support",
  "announcements",
  // Current vocabulary (schema/constants.ts GROUP_CATEGORIES).
  "health_conditions",
  "hcp_professional",
  "fitness_wellness",
  "medication",
  "community_support",
];

const NEVER_SELF_JOINABLE_TYPES: readonly string[] = ["premium", "admin"];
const VERIFIED_TYPES: readonly string[] = ["verified", "hcp_verified"];

export interface JoinableConversation {
  type?: string | null;
  is_deleted?: boolean | null;
  status?: string | null;
  group_type?: string | null;
  group_category?: string | null;
  is_verified_only?: boolean | null;
}

export interface CallerFacts {
  isVerifiedHcp: boolean;
  ownsLinkedFacility: boolean;
}

export type JoinDecision = { ok: true } | { ok: false; reason: string; code: LockReason };

/**
 * AF-05 Part 3: machine-readable reason a group is not joinable, so the
 * Discover list can show a *locked* row with the right affordance instead of
 * hiding the group entirely.
 *   - `unavailable`   — not a group / deleted / inactive (never listed)
 *   - `invitation`    — premium/admin type: invitation-only
 *   - `qualification` — needs HCP verification, facility ownership, or a
 *                       category the caller isn't eligible for
 *   - `full`          — at max_members (computed by the caller, which knows the
 *                       member count; decideJoin itself is capacity-agnostic)
 */
export type LockReason = "unavailable" | "invitation" | "qualification" | "full";

/** Honours both the legacy `is_verified_only` flag and the newer group_type
 *  vocabulary, exactly as Discover does. */
export function requiresVerifiedHcp(c: JoinableConversation): boolean {
  return (
    !!c.is_verified_only ||
    (c.group_type != null && VERIFIED_TYPES.includes(c.group_type))
  );
}

/** Pure decision: the conversation row plus two facts about the caller. */
export function decideJoin(
  c: JoinableConversation,
  caller: CallerFacts,
): JoinDecision {
  if (c.type !== "group" || c.is_deleted || (c.status ?? "active") !== "active") {
    return { ok: false, reason: "This conversation cannot be joined.", code: "unavailable" };
  }

  if (c.group_type != null && NEVER_SELF_JOINABLE_TYPES.includes(c.group_type)) {
    return { ok: false, reason: "This group is by invitation only.", code: "invitation" };
  }

  const notEligible: JoinDecision = {
    ok: false,
    reason: "You are not eligible to join this group.",
    code: "qualification",
  };

  if (c.group_category === "facility") {
    if (!caller.ownsLinkedFacility) return notEligible;
  } else if (
    c.group_category == null ||
    !SELF_JOINABLE_CATEGORIES.includes(c.group_category)
  ) {
    return notEligible;
  }

  if (requiresVerifiedHcp(c) && !caller.isVerifiedHcp) return notEligible;

  return { ok: true };
}

/**
 * Loads only the caller facts the decision needs (no verification lookup for
 * an open group, no facility lookup for a non-facility one). Throws on a
 * database error so the route fails closed with a 500 rather than guessing.
 */
export async function loadCallerFacts(
  admin: Admin,
  userId: string,
  conversationId: string,
  c: JoinableConversation,
): Promise<CallerFacts> {
  const facts: CallerFacts = { isVerifiedHcp: false, ownsLinkedFacility: false };

  if (requiresVerifiedHcp(c)) {
    const { data, error } = await admin
      .from("hcp_verifications")
      .select("id")
      .eq("user_id", userId)
      .eq("verification_status", "verified")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    facts.isVerifiedHcp = !!data;
  }

  if (c.group_category === "facility") {
    const { data: links, error: linksError } = await admin
      .from("facility_conversations")
      .select("facility_id")
      .eq("conversation_id", conversationId);
    if (linksError) throw linksError;

    const facilityIds = (links ?? []).map((l) => l.facility_id);
    if (facilityIds.length > 0) {
      const { data: owned, error: ownedError } = await admin
        .from("facility_profile")
        .select("id")
        .eq("owner_id", userId)
        .in("id", facilityIds)
        .limit(1);
      if (ownedError) throw ownedError;
      facts.ownsLinkedFacility = (owned ?? []).length > 0;
    }
  }

  return facts;
}
