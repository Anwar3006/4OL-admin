import { describe, expect, it } from "vitest";
import {
  isFeatureFlagVisible,
  toggleFeatureFlagVisibility,
} from "@/lib/feature-flags";

describe("admin feature-flag visibility", () => {
  it("treats active PostHog flags at 0% as off", () => {
    expect(
      isFeatureFlagVisible({ enabled: true, rollout_percentage: 0 }),
    ).toBe(false);
  });

  it("treats an enabled 100% flag as visible", () => {
    expect(
      isFeatureFlagVisible({ enabled: true, rollout_percentage: 100 }),
    ).toBe(true);
  });

  it("turns a staged 0% flag into a full 100% rollout", () => {
    expect(
      toggleFeatureFlagVisibility({ enabled: true, rollout_percentage: 0 }),
    ).toEqual({ enabled: true, rollout_percentage: 100 });
  });

  it("turns any visible flag off at 0%", () => {
    expect(
      toggleFeatureFlagVisibility({ enabled: true, rollout_percentage: 25 }),
    ).toEqual({ enabled: false, rollout_percentage: 0 });
  });
});

