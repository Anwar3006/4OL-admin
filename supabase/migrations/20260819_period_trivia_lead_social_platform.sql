alter table public.period_trivia_leads
  add column if not exists social_platform text not null default 'unknown';

comment on column public.period_trivia_leads.social_platform is
  'Selected social media platform for the encrypted social handle.';

drop function if exists public.submit_period_trivia(uuid,uuid,text,text,smallint,jsonb,integer,text,text,text,text,text,text,text,text);

create or replace function public.submit_period_trivia(
  p_event_id uuid, p_user_id uuid, p_device_hash text, p_mobile_hash text,
  p_score smallint, p_answers jsonb, p_duration_seconds integer,
  p_full_name_ciphertext text, p_mobile_ciphertext text, p_social_platform text,
  p_social_handle_ciphertext text, p_consent_version text, p_campaign_code text,
  p_utm_source text, p_utm_medium text, p_utm_campaign text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_submission_id uuid;
begin
  if not exists (
    select 1 from public.period_trivia_events
    where id = p_event_id and status in ('ready','live') and now() between starts_at and ends_at
  ) then raise exception 'event is not accepting submissions'; end if;
  if jsonb_array_length(p_answers) <> 10 or p_score not between 0 and 10 then
    raise exception 'invalid trivia submission';
  end if;
  insert into public.period_trivia_submissions(event_id,user_id,device_hash,mobile_hash,score,answers,duration_seconds)
  values(p_event_id,p_user_id,p_device_hash,p_mobile_hash,p_score,p_answers,p_duration_seconds)
  returning id into v_submission_id;
  insert into public.period_trivia_leads(
    event_id,submission_id,user_id,full_name_ciphertext,mobile_ciphertext,
    social_platform,social_handle_ciphertext,mobile_hash,consent_version,
    campaign_code,utm_source,utm_medium,utm_campaign
  )
  values(
    p_event_id,v_submission_id,p_user_id,p_full_name_ciphertext,p_mobile_ciphertext,
    coalesce(nullif(trim(p_social_platform), ''), 'unknown'),p_social_handle_ciphertext,
    p_mobile_hash,p_consent_version,p_campaign_code,p_utm_source,p_utm_medium,p_utm_campaign
  );
  return v_submission_id;
end;
$$;

revoke all on function public.submit_period_trivia(uuid,uuid,text,text,smallint,jsonb,integer,text,text,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_period_trivia(uuid,uuid,text,text,smallint,jsonb,integer,text,text,text,text,text,text,text,text,text) to service_role;
