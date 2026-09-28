-- P2-01 / P2-02: a member's group-session QR pass is a separate, fail-closed
-- rollout from general bookings. PostHog controls discovery in the app; this
-- audited database mirror controls whether a token can be returned at all.

insert into public.feature_flags (name, description, enabled, rollout_percentage)
values (
  'consumer-trainer-session-passes',
  'Controls consumer discovery and delivery of trainer group-session QR passes. Keep disabled until the PostHog rollout is ready.',
  false,
  0
)
on conflict (name) do nothing;

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
          'consumer-bookings',
          'consumer-trainer-session-passes'
        )
    ),
    false
  );
$function$;

create or replace function public.get_my_bookings()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id, 'provider_id', b.provider_id, 'provider_name', p.name,
    'service_name', ci.name, 'starts_at', b.starts_at, 'ends_at', b.ends_at,
    'mode', b.mode, 'status', b.status, 'provider_note', b.provider_note,
    'suggested_starts_at', b.suggested_starts_at,
    'session_pass_token', case
      when ci.item_type = 'session'
        and b.status = 'confirmed'
        and public.is_feature_enabled('consumer-trainer-session-passes')
      then (
        select a.qr_token::text
        from public.provider_booking_group_attendees a
        where a.booking_id = b.id and a.attendee_user_id = (select auth.uid())
      )
      else null
    end
  ) order by b.starts_at desc), '[]'::jsonb)
  from public.provider_bookings b
  join public.providers p on p.id = b.provider_id
  join public.provider_catalogue_items ci on ci.id = b.catalogue_item_id
  where b.patient_id = (select auth.uid());
$$;

revoke execute on function public.is_feature_enabled(text) from public;
grant execute on function public.is_feature_enabled(text) to anon, authenticated;
revoke execute on function public.get_my_bookings() from public;
grant execute on function public.get_my_bookings() to authenticated, service_role;

notify pgrst, 'reload schema';
