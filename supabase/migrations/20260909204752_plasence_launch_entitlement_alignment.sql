-- Plasence launch contract:
--   free = logging + basic period/fertility estimates
--   Cycle Pro = interpretation + reports + deeper comparisons
-- Keep the commercial copy limited to capabilities the app actually gates.
update public.subscription_tiers
set
  benefits = jsonb_build_array(
    'Detailed cycle and symptom insights',
    'Cycle regularity and multi-cycle trend analysis',
    'Temperature trend interpretation',
    'Personalized fertility insight cards',
    'Clinician-ready PDF reports'
  )
where key = 'cycle_pro';

-- The launch blockers have been closed. The current mobile client treats an
-- enabled flag as available to all users, so rollout_percent must reflect the
-- actual behavior rather than suggesting a partial rollout that is not enforced.
update public.period_feature_flags
set enabled = true, rollout_percent = 100, updated_at = now()
where key = 'ttc_mode_v1';

-- Service-role-only reminder RPC; pin its object resolution even though it is
-- SECURITY INVOKER so the database advisor does not report a mutable path.
alter function public.get_due_period_reminders(timestamptz)
  set search_path = public;
