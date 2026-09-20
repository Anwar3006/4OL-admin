-- Rollback for 20260920160000_seed_provider_feature_flags.sql
-- Only removes rows if they're still at their seeded (untouched) state —
-- won't clobber a flag a super admin has since toggled on or given a
-- real rollout percentage.

delete from public.feature_flags
 where name in ('provider_portal', 'rx_epharmacy', 'provider_bookings', 'provider_paid_chat', 'order_payments')
   and enabled = false
   and rollout_percentage = 0;
