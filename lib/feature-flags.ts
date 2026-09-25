/** The local mirror and PostHog both require these two values to be live. */
export type FeatureFlagVisibilityState = {
  enabled: boolean;
  rollout_percentage: number | null | undefined;
};

/**
 * A flag with a 0% rollout resolves false for every device, even when its
 * PostHog `active` bit is true. Treat it as off everywhere the admin describes
 * effective visibility.
 */
export function isFeatureFlagVisible(flag: FeatureFlagVisibilityState): boolean {
  return flag.enabled && (flag.rollout_percentage ?? 100) > 0;
}

/** A dashboard switch is binary: always write an unambiguous 0% or 100%. */
export function toggleFeatureFlagVisibility(
  flag: FeatureFlagVisibilityState,
): Pick<FeatureFlagVisibilityState, "enabled" | "rollout_percentage"> {
  const nextVisible = !isFeatureFlagVisible(flag);

  return {
    enabled: nextVisible,
    rollout_percentage: nextVisible ? 100 : 0,
  };
}

