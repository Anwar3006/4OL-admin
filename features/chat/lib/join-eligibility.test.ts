import { describe, expect, it } from "vitest";
import {
  decideJoin,
  requiresVerifiedHcp,
  SELF_JOINABLE_CATEGORIES,
  type CallerFacts,
  type JoinableConversation,
} from "./join-eligibility";

const nobody: CallerFacts = { isVerifiedHcp: false, ownsLinkedFacility: false };
const hcp: CallerFacts = { isVerifiedHcp: true, ownsLinkedFacility: false };
const owner: CallerFacts = { isVerifiedHcp: false, ownsLinkedFacility: true };
const verifiedOwner: CallerFacts = { isVerifiedHcp: true, ownsLinkedFacility: true };

const openGroup = (over: JoinableConversation = {}): JoinableConversation => ({
  type: "group",
  is_deleted: false,
  status: "active",
  group_type: "open",
  group_category: "general",
  is_verified_only: false,
  ...over,
});

describe("decideJoin", () => {
  it("lets anyone join an active open group, in either category vocabulary", () => {
    expect(decideJoin(openGroup(), nobody).ok).toBe(true);
    expect(decideJoin(openGroup({ group_category: "community_support" }), nobody).ok).toBe(true);
    for (const category of SELF_JOINABLE_CATEGORIES) {
      expect(decideJoin(openGroup({ group_category: category }), nobody).ok).toBe(true);
    }
  });

  it("treats a missing status as active (matches the column default)", () => {
    expect(decideJoin(openGroup({ status: null }), nobody).ok).toBe(true);
    expect(decideJoin(openGroup({ status: undefined }), nobody).ok).toBe(true);
  });

  it("refuses direct chats, deleted groups and non-active groups", () => {
    expect(decideJoin(openGroup({ type: "direct" }), nobody).ok).toBe(false);
    expect(decideJoin(openGroup({ is_deleted: true }), nobody).ok).toBe(false);
    expect(decideJoin(openGroup({ status: "archived" }), nobody).ok).toBe(false);
    expect(decideJoin(openGroup({ status: "inactive" }), nobody).ok).toBe(false);
    expect(decideJoin(openGroup({ type: null }), nobody).ok).toBe(false);
  });

  it("never lets premium or admin groups be self-joined, whoever asks", () => {
    for (const group_type of ["premium", "admin"]) {
      expect(decideJoin(openGroup({ group_type }), verifiedOwner).ok).toBe(false);
    }
  });

  it("gates verified-only groups on an approved HCP verification", () => {
    for (const over of [
      { group_type: "hcp_verified" },
      { group_type: "verified" },
      { is_verified_only: true },
    ]) {
      expect(decideJoin(openGroup(over), nobody).ok).toBe(false);
      expect(decideJoin(openGroup(over), hcp).ok).toBe(true);
    }
  });

  it("gates facility groups on owning the linked facility", () => {
    const facility = openGroup({ group_category: "facility" });
    expect(decideJoin(facility, nobody).ok).toBe(false);
    expect(decideJoin(facility, hcp).ok).toBe(false);
    expect(decideJoin(facility, owner).ok).toBe(true);
  });

  it("a verified-only facility group needs BOTH (as Discover does)", () => {
    const facility = openGroup({
      group_category: "facility",
      group_type: "hcp_verified",
      is_verified_only: true,
    });
    expect(decideJoin(facility, owner).ok).toBe(false);
    expect(decideJoin(facility, hcp).ok).toBe(false);
    expect(decideJoin(facility, verifiedOwner).ok).toBe(true);
  });

  it("fails closed on admin-only, unknown and missing categories", () => {
    expect(decideJoin(openGroup({ group_category: "bedtracker_emergency" }), verifiedOwner).ok).toBe(false);
    expect(decideJoin(openGroup({ group_category: "something_new" }), verifiedOwner).ok).toBe(false);
    expect(decideJoin(openGroup({ group_category: null }), verifiedOwner).ok).toBe(false);
  });

  it("does not leak why: every refusal carries a reason string", () => {
    const d = decideJoin(openGroup({ type: "direct" }), nobody);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason.length).toBeGreaterThan(0);
  });
});

describe("requiresVerifiedHcp", () => {
  it("honours the legacy flag and both verified group types", () => {
    expect(requiresVerifiedHcp({ is_verified_only: true })).toBe(true);
    expect(requiresVerifiedHcp({ group_type: "verified" })).toBe(true);
    expect(requiresVerifiedHcp({ group_type: "hcp_verified" })).toBe(true);
    expect(requiresVerifiedHcp({ group_type: "open" })).toBe(false);
    expect(requiresVerifiedHcp({})).toBe(false);
  });
});
