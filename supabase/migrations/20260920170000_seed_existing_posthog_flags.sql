-- P0-07: mirror the 23 feature flags that already existed in PostHog before
-- this table's sync was built (project 579614, fetched live via the
-- Feature Flags REST API on 20 Sept). These are the mobile app's
-- category-visibility flags (hooks/use-categoryData.tsx,
-- ChatsScreenContent.tsx, GoogleMapContainer.tsx all call
-- useFeatureFlags(posthog) with these exact keys).
--
-- `enabled` mirrors PostHog's `active` bit literally — every one of these
-- flags is `active: true` in PostHog today. `rollout_percentage` is a
-- separate, deliberate dial (0 for most of them, 100 for the five already
-- live) — confirmed intentional: active:true + rollout:0 means "staged,
-- turn on when ready," not "disabled." lib/posthog-admin.ts's
-- effectiveFlagState() mirrors both fields the same independent way, so
-- this migration and the app/api/settings/feature-flags/sync route agree.
--
-- `on conflict (name) do nothing` — safe to re-run, and won't clobber a
-- row a super admin has already touched via Settings before this ran.

insert into public.feature_flags (name, description, enabled, rollout_percentage)
values
  ('category-diseases', 'Whether to allow users to see this in the category list or not', true, 100),
  ('category-fitness', 'Whether to allow users to see this in the category list or not', true, 100),
  ('category-healthy-living', 'Whether to allow users to see this in the category list or not', true, 100),
  ('category-plasence', 'Whether to allow users to see this in the category list or not', true, 100),
  ('category-symptoms', 'Whether to allow users to see this in the category list or not', true, 100),
  ('facility-scout-report', 'Whether to allow users to see this in the category list or not', true, 0),
  ('category-find-medication', 'Whether to allow users to see this in the category list or not', true, 0),
  ('category-wellness', 'Whether to allow users to see this in the category list or not', true, 0),
  ('category-jobs', 'Whether to allow users to see this in the category list or not', true, 0),
  ('category-anatomy', 'Whether to allow users to see this in the category list or not', true, 0),
  ('category-psychiatric', 'Whether to allow users to see this in the category list or not', true, 0),
  ('category-health-schools', 'Whether to allow users to see this in the category list or not', true, 0),
  ('category-prosthetics', 'Whether to allow users to see this in the category list or not', true, 0),
  ('category-osteopathy', 'Whether to allow users to see this in the category list or not', true, 0),
  ('category-dental', 'Whether to allow users to see this in the category list or not', true, 0),
  ('category-eye-care', 'Whether to allow users to see this in the category list or not', true, 0),
  ('category-physiotherapy', 'Whether to allow users to see this in the category list or not', true, 0),
  ('category-homes', 'Whether to allow users to see this in the category list or not', true, 0),
  ('category-ambulance', 'Whether to allow users to see this in the category list or not', true, 0),
  ('category-herbal-hospitals', 'Whether to allow users to see this in the category list or not', true, 0),
  ('category-diagnostic-labs', 'Whether to allow users to see this in the category list or not', true, 0),
  ('category-hospitals', 'Whether to allow users to see this in the category list or not', true, 0),
  ('category-pharmacies', 'Whether to allow users to see this in the category list or not', true, 0)
on conflict (name) do nothing;
