-- P2-01 · Consumer booking and appointment entry gate.
--
-- PostHog is the runtime evaluator for the consumer app. `feature_flags` is
-- the audited, admin-managed mirror: Settings writes both systems and records
-- the change in `settings_audit_log`. It starts enabled so the initial
-- consumer shell is visible while the PostHog flag is being created; turn it
-- off in Settings before any later booking rollout needs to be paused.
--
-- The consumer hook follows the established category convention: only an
-- explicit PostHog `false` hides the entry. This avoids a missing newly-added
-- PostHog key making the mobile route disappear during setup.

insert into public.feature_flags (name, description, enabled, rollout_percentage)
values (
  'consumer-bookings',
  'Controls consumer booking discovery and the Reminders appointments entry. Set false to pause the consumer booking rollout.',
  true,
  100
)
on conflict (name) do nothing;

-- Booking RPCs added later in P2-01 must enforce this same flag.  Adding it
-- to the narrow public reader now keeps the database gate and the PostHog UI
-- gate on one named, audited rollout control.
create or replace function public.is_feature_enabled(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(
    (
      select f.enabled and coalesce(f.rollout_percentage, 100) > 0
      from public.feature_flags f
      where f.name = p_name
        and p_name in (
          'provider_portal',
          'rx_epharmacy',
          'provider_paid_chat',
          'consumer-bookings'
        )
    ),
    false
  );
$function$;

revoke execute on function public.is_feature_enabled(text) from public;
grant execute on function public.is_feature_enabled(text) to anon, authenticated;
