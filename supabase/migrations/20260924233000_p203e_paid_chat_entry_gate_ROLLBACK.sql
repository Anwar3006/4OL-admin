-- Rollback for 20260924233000_p203e_paid_chat_entry_gate.sql.
-- Restores the prior direct-conversation behaviour.  Existing conversations
-- and messages are retained; only new paid-chat enforcement is removed.

drop function if exists public.fn_start_paid_enquiry_chat(uuid);
drop function if exists public.user_has_all_access(uuid);

create or replace function public.is_feature_enabled(p_name text)
returns boolean language sql stable security definer set search_path = '' as $function$
  select coalesce((select f.enabled and coalesce(f.rollout_percentage, 100) > 0
    from public.feature_flags f where f.name = p_name
      and p_name in ('provider_portal', 'rx_epharmacy')), false);
$function$;

create or replace function public.fn_get_or_create_direct_conversation(p_other_user_id uuid, p_enquiry_id uuid default null)
returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare v_me uuid := auth.uid(); v_id uuid;
begin
  if v_me is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if p_other_user_id is null or p_other_user_id = v_me then raise exception 'A direct conversation needs a different second person' using errcode = '22023'; end if;
  if not exists (select 1 from public.user_profiles up where up.user_id = p_other_user_id) then raise exception 'No such user' using errcode = '23503'; end if;
  if p_enquiry_id is not null and not exists (select 1 from public.medication_enquiries me where me.id = p_enquiry_id and (me.user_id = v_me or exists (select 1 from public.enquiry_responses er join public.provider_members pm on pm.provider_id = er.facility_id where er.enquiry_id = me.id and pm.user_id = v_me and pm.status = 'active'))) then raise exception 'That enquiry is not yours' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(least(v_me::text, p_other_user_id::text) || '|' || greatest(v_me::text, p_other_user_id::text) || '|' || coalesce(p_enquiry_id::text, ''), 0));
  select c.id into v_id from public.conversations c where c.type = 'direct' and c.is_deleted = false and c.enquiry_id is not distinct from p_enquiry_id and exists (select 1 from public.conversation_members m where m.conversation_id = c.id and m.user_id = v_me and m.left_at is null) and exists (select 1 from public.conversation_members m where m.conversation_id = c.id and m.user_id = p_other_user_id and m.left_at is null) and (select count(*) from public.conversation_members m where m.conversation_id = c.id and m.left_at is null) = 2 order by c.created_at limit 1;
  if v_id is not null then return v_id; end if;
  insert into public.conversations (type, is_group, created_by, enquiry_id) values ('direct', false, v_me, p_enquiry_id) returning id into v_id;
  insert into public.conversation_members (conversation_id, user_id, role) values (v_id, v_me, 'member'), (v_id, p_other_user_id, 'member') on conflict (conversation_id, user_id) do nothing;
  return v_id;
end;
$function$;
revoke all on function public.fn_get_or_create_direct_conversation(uuid, uuid) from public, anon;
grant execute on function public.fn_get_or_create_direct_conversation(uuid, uuid) to authenticated, service_role;
notify pgrst, 'reload schema';
