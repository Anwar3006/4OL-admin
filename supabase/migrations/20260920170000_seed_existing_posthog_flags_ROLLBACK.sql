-- Rollback for 20260920170000_seed_existing_posthog_flags.sql
-- Only removes rows still at their seeded values — won't clobber a row a
-- super admin has since toggled or that the sync route has since updated
-- from a real change in PostHog.

delete from public.feature_flags
 where name in (
   'category-diseases','category-fitness','category-healthy-living','category-plasence',
   'category-symptoms','facility-scout-report','category-find-medication','category-wellness',
   'category-jobs','category-anatomy','category-psychiatric','category-health-schools',
   'category-prosthetics','category-osteopathy','category-dental','category-eye-care',
   'category-physiotherapy','category-homes','category-ambulance','category-herbal-hospitals',
   'category-diagnostic-labs','category-hospitals','category-pharmacies'
 )
 and (
   (name in ('category-diseases','category-fitness','category-healthy-living','category-plasence','category-symptoms')
    and enabled = true and rollout_percentage = 100)
   or
   (name not in ('category-diseases','category-fitness','category-healthy-living','category-plasence','category-symptoms')
    and enabled = true and rollout_percentage = 0)
 );
