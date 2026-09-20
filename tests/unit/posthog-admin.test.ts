import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PostHogSyncError,
  effectiveFlagState,
  findPostHogFlagByKey,
  getPostHogFlagState,
  isPostHogConfigured,
  listPostHogFlags,
  missingPostHogConfig,
  upsertPostHogFlag,
} from "@/lib/posthog-admin";

const ENV = { ...process.env };

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

beforeEach(() => {
  delete process.env.POSTHOG_PERSONAL_API_KEY;
  delete process.env.POSTHOG_PROJECT_ID;
  delete process.env.POSTHOG_HOST;
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  process.env = { ...ENV };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("missingPostHogConfig / isPostHogConfigured", () => {
  it("names both required variables when neither is set", () => {
    expect(missingPostHogConfig()).toEqual(["POSTHOG_PERSONAL_API_KEY", "POSTHOG_PROJECT_ID"]);
    expect(isPostHogConfigured()).toBe(false);
  });

  it("names only the variable that is missing", () => {
    process.env.POSTHOG_PERSONAL_API_KEY = "phx_test";
    expect(missingPostHogConfig()).toEqual(["POSTHOG_PROJECT_ID"]);
  });

  it("is configured once both required variables are set", () => {
    process.env.POSTHOG_PERSONAL_API_KEY = "phx_test";
    process.env.POSTHOG_PROJECT_ID = "12345";
    expect(missingPostHogConfig()).toEqual([]);
    expect(isPostHogConfigured()).toBe(true);
  });
});

describe("without configuration", () => {
  it("listPostHogFlags throws PostHogSyncError without calling fetch", async () => {
    await expect(listPostHogFlags()).rejects.toThrow(PostHogSyncError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("upsertPostHogFlag throws naming the missing vars", async () => {
    await expect(
      upsertPostHogFlag({ key: "provider_portal", name: "provider_portal", active: false, rolloutPercentage: 0 }),
    ).rejects.toThrow(/POSTHOG_PERSONAL_API_KEY.*POSTHOG_PROJECT_ID/);
  });
});

describe("with configuration", () => {
  beforeEach(() => {
    process.env.POSTHOG_PERSONAL_API_KEY = "phx_test";
    process.env.POSTHOG_PROJECT_ID = "12345";
    process.env.POSTHOG_HOST = "https://app.posthog.com";
  });

  it("listPostHogFlags follows pagination and drops deleted flags", async () => {
    const page1 = {
      results: [
        { id: 1, key: "provider_portal", name: "provider_portal", active: false, filters: { groups: [] } },
        { id: 2, key: "gone", name: "gone", active: false, filters: { groups: [] }, deleted: true },
      ],
      next: "https://app.posthog.com/api/projects/12345/feature_flags/?page=2",
    };
    const page2 = {
      results: [{ id: 3, key: "rx_epharmacy", name: "rx_epharmacy", active: true, filters: { groups: [] } }],
      next: null,
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(page1))
      .mockResolvedValueOnce(jsonResponse(page2));

    const flags = await listPostHogFlags();

    expect(flags.map((f) => f.key)).toEqual(["provider_portal", "rx_epharmacy"]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      "https://app.posthog.com/api/projects/12345/feature_flags/?limit=100",
    );
  });

  it("findPostHogFlagByKey returns null when the key isn't present", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ results: [], next: null }));
    await expect(findPostHogFlagByKey("nope")).resolves.toBeNull();
  });

  it("upsertPostHogFlag POSTs a new flag when it doesn't exist, mapping rollout into a single group", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ results: [], next: null })) // list (lookup)
      .mockResolvedValueOnce(
        jsonResponse({ id: 9, key: "provider_portal", name: "provider_portal", active: true, filters: { groups: [{ properties: [], rollout_percentage: 50 }] } }),
      );

    const flag = await upsertPostHogFlag({
      key: "provider_portal",
      name: "provider_portal",
      active: true,
      rolloutPercentage: 50,
    });

    expect(flag.id).toBe(9);
    const [url, init] = vi.mocked(fetch).mock.calls[1];
    expect(url).toBe("https://app.posthog.com/api/projects/12345/feature_flags/");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      key: "provider_portal",
      name: "provider_portal",
      active: true,
      filters: { groups: [{ properties: [], rollout_percentage: 50 }] },
    });
  });

  it("upsertPostHogFlag PATCHes the existing flag's id when found", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({ results: [{ id: 7, key: "rx_epharmacy", name: "rx_epharmacy", active: false, filters: { groups: [] } }], next: null }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: 7, key: "rx_epharmacy", name: "rx_epharmacy", active: true, filters: { groups: [{ properties: [], rollout_percentage: 100 }] } }),
      );

    await upsertPostHogFlag({ key: "rx_epharmacy", name: "rx_epharmacy", active: true, rolloutPercentage: 100 });

    const [url, init] = vi.mocked(fetch).mock.calls[1];
    expect(url).toBe("https://app.posthog.com/api/projects/12345/feature_flags/7/");
    expect(init?.method).toBe("PATCH");
  });

  it("upsertPostHogFlag pushes active and rollout_percentage independently — active:true, rollout:0 is a valid, intentional combination", async () => {
    // Confirmed with the team: active means "staged," rollout_percentage is
    // the separate, deliberate dial for turning it on for users. Most of
    // this project's real flags sit at exactly active:true, rollout:0 on
    // purpose, so this must NOT be "corrected" to 100.
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ results: [], next: null }))
      .mockResolvedValueOnce(jsonResponse({ id: 1, key: "provider_portal", name: "provider_portal", active: true, filters: { groups: [{ properties: [], rollout_percentage: 0 }] } }));

    await upsertPostHogFlag({ key: "provider_portal", name: "provider_portal", active: true, rolloutPercentage: 0 });

    const [, init] = vi.mocked(fetch).mock.calls[1];
    expect(JSON.parse(init?.body as string).filters).toEqual({
      groups: [{ properties: [], rollout_percentage: 0 }],
    });
  });

  it("upsertPostHogFlag throws PostHogSyncError on a non-ok response", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ results: [], next: null }))
      .mockResolvedValueOnce(jsonResponse({ detail: "nope" }, false, 403));

    await expect(
      upsertPostHogFlag({ key: "provider_portal", name: "provider_portal", active: true, rolloutPercentage: 0 }),
    ).rejects.toThrow(PostHogSyncError);
  });

  it("getPostHogFlagState returns null when PostHog has no such flag", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ results: [], next: null }));
    await expect(getPostHogFlagState("provider_portal")).resolves.toBeNull();
  });

  it("getPostHogFlagState reads active + the first group's rollout_percentage", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        results: [
          {
            id: 1,
            key: "provider_portal",
            name: "provider_portal",
            active: true,
            filters: { groups: [{ properties: [], rollout_percentage: 25 }] },
          },
        ],
        next: null,
      }),
    );

    await expect(getPostHogFlagState("provider_portal")).resolves.toEqual({
      active: true,
      rolloutPercentage: 25,
    });
  });

  it("getPostHogFlagState defaults rollout to 100 when the group has no explicit percentage", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        results: [
          { id: 1, key: "provider_portal", name: "provider_portal", active: true, filters: { groups: [{ properties: [], rollout_percentage: null }] } },
        ],
        next: null,
      }),
    );

    await expect(getPostHogFlagState("provider_portal")).resolves.toEqual({
      active: true,
      rolloutPercentage: 100,
    });
  });

  it("getPostHogFlagState keeps active:true + rollout:0 as active:true — that's an intentional staged state, not disabled", async () => {
    // The real shape most of this project's category-* flags are stored
    // in: registered/active, dialed to 0% until deliberately turned on.
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        results: [
          { id: 1, key: "category-jobs", name: "Whether to allow users to see this in the category list or not", active: true, filters: { groups: [{ properties: [], rollout_percentage: 0 }] } },
        ],
        next: null,
      }),
    );

    await expect(getPostHogFlagState("category-jobs")).resolves.toEqual({
      active: true,
      rolloutPercentage: 0,
    });
  });
});

describe("effectiveFlagState (pure)", () => {
  it("mirrors active as-is when false, regardless of rollout", () => {
    expect(
      effectiveFlagState({ id: 1, key: "k", name: "k", active: false, filters: { groups: [{ properties: [], rollout_percentage: 100 }] } }),
    ).toEqual({ active: false, rolloutPercentage: 100 });
  });

  it("mirrors active:true even when rollout is 0 — active and rollout are independent", () => {
    expect(
      effectiveFlagState({ id: 1, key: "k", name: "k", active: true, filters: { groups: [{ properties: [], rollout_percentage: 0 }] } }),
    ).toEqual({ active: true, rolloutPercentage: 0 });
  });

  it("mirrors active:true with rollout:100", () => {
    expect(
      effectiveFlagState({ id: 1, key: "k", name: "k", active: true, filters: { groups: [{ properties: [], rollout_percentage: 100 }] } }),
    ).toEqual({ active: true, rolloutPercentage: 100 });
  });

  it("defaults rollout to 100 (full rollout) when there is no group at all", () => {
    expect(effectiveFlagState({ id: 1, key: "k", name: "k", active: true, filters: { groups: [] } })).toEqual({
      active: true,
      rolloutPercentage: 100,
    });
  });
});
