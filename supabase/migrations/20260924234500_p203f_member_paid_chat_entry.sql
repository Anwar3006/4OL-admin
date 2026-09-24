-- P2-03 · Member entry point for a paid, request-linked provider chat.
-- The member sees an offer id, never a provider user's id; derive the active
-- provider recipient inside the database and re-use the central gate.
create or replace function public.fn_start_paid_chat_from_offer(p_response_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_me uuid := auth.uid();
  v_enquiry_id uuid;
  v_provider_user_id uuid;
begin
  if v_me is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  select er.enquiry_id into v_enquiry_id
  from public.enquiry_responses er
  join public.medication_enquiries me on me.id = er.enquiry_id
  where er.id = p_response_id and me.user_id = v_me and er.status in ('offered', 'accepted');
  if v_enquiry_id is null then raise exception 'That offer is not available for chat' using errcode = '42501'; end if;
  select pm.user_id into v_provider_user_id
  from public.enquiry_responses er
  join public.provider_members pm on pm.provider_id = er.facility_id
  where er.id = p_response_id and pm.status = 'active'
  order by case pm.role when 'owner' then 0 when 'admin' then 1 else 2 end, pm.created_at
  limit 1;
  if v_provider_user_id is null then raise exception 'This provider cannot receive messages yet' using errcode = '42501'; end if;
  return public.fn_get_or_create_direct_conversation(v_provider_user_id, v_enquiry_id);
end;
$function$;
revoke all on function public.fn_start_paid_chat_from_offer(uuid) from public, anon;
grant execute on function public.fn_start_paid_chat_from_offer(uuid) to authenticated, service_role;
notify pgrst, 'reload schema';
