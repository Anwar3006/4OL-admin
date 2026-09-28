-- The mobile client now uses fn_request_join for restricted groups. Keep the
-- same eligibility boundary as the legacy BFF so a caller cannot request to
-- join a facility, verified, premium, or unknown-category group merely by
-- knowing its UUID.
create or replace function public.fn_request_join(
  p_conversation_id uuid,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_me uuid := auth.uid();
  v_visibility text;
  v_category text;
  v_group_type text;
  v_verified_only boolean;
  v_id uuid;
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select c.visibility, c.group_category, c.group_type, coalesce(c.is_verified_only, false)
    into v_visibility, v_category, v_group_type, v_verified_only
  from public.conversations c
  where c.id = p_conversation_id
    and c.type = 'group'
    and coalesce(c.is_group, false) = true
    and coalesce(c.is_deleted, false) = false
    and coalesce(c.status, 'active') = 'active';

  if not found then
    raise exception 'Group not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.conversation_members m
    where m.conversation_id = p_conversation_id
      and m.user_id = v_me
      and m.left_at is null
  ) then
    return jsonb_build_object('ok', true, 'status', 'member');
  end if;

  if v_visibility = 'private' then
    raise exception 'This group requires an invitation' using errcode = '42501';
  end if;

  if v_group_type in ('premium', 'admin') then
    raise exception 'This group is by invitation only' using errcode = '42501';
  end if;

  if v_category = 'facility' then
    if not exists (
      select 1
      from public.facility_conversations fc
      join public.facility_profile fp on fp.id = fc.facility_id
      where fc.conversation_id = p_conversation_id
        and fp.owner_id = v_me
    ) then
      raise exception 'You are not eligible to join this group' using errcode = '42501';
    end if;
  elsif v_category is null or v_category not in (
    'general', 'specialty', 'support', 'announcements',
    'health_conditions', 'hcp_professional', 'fitness_wellness',
    'medication', 'community_support'
  ) then
    raise exception 'You are not eligible to join this group' using errcode = '42501';
  end if;

  if (v_verified_only or v_group_type in ('verified', 'hcp_verified'))
     and not exists (
       select 1 from public.hcp_verifications hv
       where hv.user_id = v_me
         and hv.verification_status = 'verified'
     ) then
    raise exception 'You are not eligible to join this group' using errcode = '42501';
  end if;

  if v_visibility = 'public' then
    if not public.fn_conversation_has_capacity(p_conversation_id) then
      raise exception 'This group is full' using errcode = '22023';
    end if;

    insert into public.conversation_members(conversation_id, user_id, role, joined_at, left_at)
    values (p_conversation_id, v_me, 'member', now(), null)
    on conflict (conversation_id, user_id) do update
      set role = 'member', joined_at = now(), left_at = null;
    return jsonb_build_object('ok', true, 'status', 'added');
  end if;

  insert into public.conversation_join_requests(
    conversation_id, user_id, requested_by_user_id, reason, status
  )
  values (
    p_conversation_id, v_me, v_me, nullif(trim(p_message), ''), 'pending'
  )
  on conflict (conversation_id, user_id) do update
    set reason = excluded.reason,
        status = 'pending',
        reviewed_by_user_id = null,
        review_reason = null,
        reviewed_at = null,
        created_at = now()
  returning id into v_id;

  return jsonb_build_object('ok', true, 'status', 'pending', 'id', v_id);
end;
$function$;

revoke all on function public.fn_request_join(uuid, text) from public, anon;
grant execute on function public.fn_request_join(uuid, text) to authenticated, service_role;
