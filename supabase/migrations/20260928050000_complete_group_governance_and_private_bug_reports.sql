-- Complete the mobile governance controls. Managers may cancel only their
-- own group's outstanding invitations; recipients still accept/decline via
-- fn_respond_invitation.
create or replace function public.fn_revoke_conversation_invitation(
  p_invitation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_me uuid := auth.uid();
  v_invitation public.conversation_invitations%rowtype;
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into v_invitation
  from public.conversation_invitations
  where id = p_invitation_id
  for update;

  if not found
     or v_invitation.status <> 'pending'
     or not public.user_can_manage_conversation(v_invitation.conversation_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  update public.conversation_invitations
  set status = 'cancelled', responded_at = now()
  where id = v_invitation.id;

  return jsonb_build_object('ok', true, 'cancelled', true);
end;
$function$;

revoke all on function public.fn_revoke_conversation_invitation(uuid)
  from public, anon;
grant execute on function public.fn_revoke_conversation_invitation(uuid)
  to authenticated, service_role;

-- Bugs belong in private Support Tickets, where screenshots and personal or
-- security-sensitive details are safe to triage. Existing historical bug
-- posts remain readable; this only blocks new public submissions.
create or replace function public.submit_feedback_post(
  p_category text,
  p_title text,
  p_body text,
  p_rating smallint default null,
  p_module text default null,
  p_is_anonymous boolean default false,
  p_app_version text default null,
  p_platform text default null,
  p_source text default 'board'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_me uuid := auth.uid();
  v_id uuid;
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_category = 'bug' then
    raise exception 'Please report technical problems through Support so we can handle them privately.' using errcode = '22023';
  end if;
  if p_category not in ('review', 'suggestion', 'recommendation', 'praise') then
    raise exception 'Invalid category' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_title, ''))) not between 3 and 140
     or char_length(trim(coalesce(p_body, ''))) not between 3 and 5000 then
    raise exception 'Feedback needs a title and description' using errcode = '22023';
  end if;
  if p_rating is not null and p_rating not between 1 and 5 then
    raise exception 'Rating must be 1 to 5' using errcode = '22023';
  end if;

  insert into public.feedback_posts(
    user_id, category, title, body, rating, module, is_anonymous,
    app_version, platform, source
  )
  values (
    v_me, p_category, trim(p_title), trim(p_body), p_rating,
    nullif(trim(p_module), ''), coalesce(p_is_anonymous, false),
    nullif(trim(p_app_version), ''), nullif(trim(p_platform), ''),
    coalesce(nullif(trim(p_source), ''), 'board')
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'visibility', 'published');
end;
$function$;

revoke all on function public.submit_feedback_post(text, text, text, smallint, text, boolean, text, text, text)
  from public, anon;
grant execute on function public.submit_feedback_post(text, text, text, smallint, text, boolean, text, text, text)
  to authenticated, service_role;
