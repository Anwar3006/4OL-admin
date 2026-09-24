-- P2-03 · Enforce paid, enquiry-scoped direct chat at its only creation boundary.
--
-- A provider never receives a patient's user id in the quote inbox, by design.
-- `fn_start_paid_enquiry_chat` therefore derives the other participant from the
-- enquiry after authorising the provider's response.  The lower-level direct
-- RPC remains the single writer of conversations and memberships.

-- `is_feature_enabled` intentionally has a small allow-list.  P2-03's flag
-- was seeded but omitted from that list, so it could never be enabled through
-- the app even after an administrator switched it on.
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
        and p_name in ('provider_portal', 'rx_epharmacy', 'provider_paid_chat')
    ),
    false
  );
$function$;

-- Does a particular account currently have the member-side all-access tier?
-- This mirrors get_my_entitlement() without pretending the caller is the
-- patient (security-definer functions retain auth.uid()).  Provider Premium
-- Plus is included because it is explicitly bridged to all-access there.
create or replace function public.user_has_all_access(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
  select exists (
    select 1
    from public.user_subscriptions us
    where us.user_id = p_user_id
      and us.status = 'active'
      and us.scope = 'all_access'
      and (us.expires_at is null or us.expires_at > now())
  )
  or exists (
    select 1
    from public.facility_subscriptions fs
    join public.marketing_subscriptions ms on ms.id = fs.subscription_id
    join public.user_profiles up on up.user_id = p_user_id
    where fs.beneficiary_user_id = p_user_id
      and fs.status = 'active'
      and (fs.current_period_end is null or fs.current_period_end > now())
      and coalesce(up.account_types, '{}'::text[]) @> array['member', 'provider']::text[]
      and 'consumer_full_access_bundle' = any (ms.privileges::text[])
  );
$function$;
revoke all on function public.user_has_all_access(uuid) from public, anon, authenticated;
grant execute on function public.user_has_all_access(uuid) to service_role;

create or replace function public.fn_get_or_create_direct_conversation(
  p_other_user_id uuid,
  p_enquiry_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_me uuid := auth.uid();
  v_id uuid;
  v_patient_id uuid;
  v_provider_id uuid;
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_other_user_id is null or p_other_user_id = v_me then
    raise exception 'A direct conversation needs a different second person'
      using errcode = '22023';
  end if;
  if p_enquiry_id is null then
    raise exception 'Paid patient chat must be linked to a request' using errcode = '22023';
  end if;
  if not public.is_feature_enabled('provider_paid_chat') then
    raise exception 'Paid patient chat is not available yet' using errcode = '42501';
  end if;

  select me.user_id into v_patient_id
  from public.medication_enquiries me
  where me.id = p_enquiry_id;
  if v_patient_id is null then
    raise exception 'No such request' using errcode = '23503';
  end if;

  -- The pair must be this request's patient and an active member of a
  -- provider that actually quoted on it.  This prevents a paid user from
  -- using an arbitrary enquiry id as a directory lookup.
  select pm.provider_id into v_provider_id
  from public.enquiry_responses er
  join public.provider_members pm on pm.provider_id = er.facility_id
  where er.enquiry_id = p_enquiry_id
    and pm.user_id = case when v_me = v_patient_id then p_other_user_id else v_me end
    and pm.status = 'active'
  limit 1;

  if not ((v_me = v_patient_id and p_other_user_id <> v_patient_id)
          or (p_other_user_id = v_patient_id and v_me <> v_patient_id))
     or v_provider_id is null then
    raise exception 'That request does not permit a chat with this account' using errcode = '42501';
  end if;
  if not public.user_has_all_access(v_patient_id) then
    raise exception 'Patient Premium is required for chat' using errcode = '42501';
  end if;
  if not public.facility_has_privilege(v_provider_id, 'paid_chat') then
    raise exception 'Provider Premium is required for chat' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    least(v_me::text, p_other_user_id::text) || '|' ||
    greatest(v_me::text, p_other_user_id::text) || '|' || p_enquiry_id::text, 0));

  select c.id into v_id
  from public.conversations c
  where c.type = 'direct' and c.is_deleted = false and c.enquiry_id = p_enquiry_id
    and exists (select 1 from public.conversation_members m where m.conversation_id = c.id and m.user_id = v_me and m.left_at is null)
    and exists (select 1 from public.conversation_members m where m.conversation_id = c.id and m.user_id = p_other_user_id and m.left_at is null)
    and (select count(*) from public.conversation_members m where m.conversation_id = c.id and m.left_at is null) = 2
  order by c.created_at limit 1;
  if v_id is not null then return v_id; end if;

  insert into public.conversations (type, is_group, created_by, enquiry_id)
  values ('direct', false, v_me, p_enquiry_id) returning id into v_id;
  insert into public.conversation_members (conversation_id, user_id, role)
  values (v_id, v_me, 'member'), (v_id, p_other_user_id, 'member')
  on conflict (conversation_id, user_id) do nothing;
  return v_id;
end;
$function$;
revoke all on function public.fn_get_or_create_direct_conversation(uuid, uuid) from public, anon;
grant execute on function public.fn_get_or_create_direct_conversation(uuid, uuid) to authenticated, service_role;

-- Provider-side ergonomic entry point.  It never returns the patient's id;
-- it only returns a conversation id once all premium and quote checks pass.
create or replace function public.fn_start_paid_enquiry_chat(p_enquiry_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_me uuid := auth.uid();
  v_patient_id uuid;
begin
  if v_me is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  select me.user_id into v_patient_id from public.medication_enquiries me where me.id = p_enquiry_id;
  if v_patient_id is null or v_patient_id = v_me then
    raise exception 'Only a responding provider can start this patient chat' using errcode = '42501';
  end if;
  return public.fn_get_or_create_direct_conversation(v_patient_id, p_enquiry_id);
end;
$function$;
revoke all on function public.fn_start_paid_enquiry_chat(uuid) from public, anon;
grant execute on function public.fn_start_paid_enquiry_chat(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
