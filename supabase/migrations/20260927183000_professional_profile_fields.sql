-- Professional profile fields and explicit, member-controlled public affiliations.

alter table public.provider_practitioner_details
  add column if not exists specialty text,
  add column if not exists years_experience integer
    check (years_experience is null or years_experience between 0 and 70),
  add column if not exists conditions_treated uuid[] not null default '{}';

alter table public.provider_members
  add column if not exists show_affiliation boolean not null default false;

create or replace function public.upsert_my_practitioner_details(
  p_provider_id uuid,
  p_patch jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_modes text[];
  v_languages text[];
  v_radius numeric;
  v_hcp_id uuid;
  v_owner_id uuid;
  v_specialty text;
  v_years integer;
  v_conditions uuid[];
begin
  if not public.is_provider_member(p_provider_id, 'settings.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select p.owner_id into v_owner_id
  from public.providers p
  where p.id = p_provider_id and p.kind = 'practitioner';

  if v_owner_id is null then
    raise exception 'Practitioner provider not found' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(distinct value), array['clinic']::text[]) into v_modes
  from jsonb_array_elements_text(coalesce(p_patch->'consult_modes', '["clinic"]'::jsonb)) value
  where value in ('clinic', 'video', 'home');

  if cardinality(v_modes) <> jsonb_array_length(coalesce(p_patch->'consult_modes', '["clinic"]'::jsonb)) then
    raise exception 'Consult modes must be clinic, video, or home' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct lower(trim(value))), array['en']::text[]) into v_languages
  from jsonb_array_elements_text(coalesce(p_patch->'languages', '["en"]'::jsonb)) value
  where nullif(trim(value), '') is not null;

  v_radius := nullif(p_patch->>'home_visit_radius_km', '')::numeric;
  if v_radius is not null and (v_radius < 0 or v_radius > 200) then
    raise exception 'Home-visit radius must be between 0 and 200 km' using errcode = '22023';
  end if;

  v_hcp_id := nullif(p_patch->>'hcp_verification_id', '')::uuid;
  if v_hcp_id is not null and not exists (
    select 1 from public.hcp_verifications h where h.id = v_hcp_id and h.user_id = v_owner_id
  ) then
    raise exception 'The selected licence does not belong to this practitioner' using errcode = '42501';
  end if;

  if p_patch ? 'specialty' then
    v_specialty := nullif(trim(p_patch->>'specialty'), '');
    if v_specialty is not null and char_length(v_specialty) > 80 then
      raise exception 'Specialty must be 80 characters or fewer' using errcode = '22023';
    end if;
  end if;

  if p_patch ? 'years_experience' then
    v_years := nullif(p_patch->>'years_experience', '')::integer;
    if v_years is not null and v_years not between 0 and 70 then
      raise exception 'Years of experience must be between 0 and 70' using errcode = '22023';
    end if;
  end if;

  if p_patch ? 'conditions_treated' then
    select coalesce(array_agg(value::uuid), '{}') into v_conditions
    from jsonb_array_elements_text(coalesce(p_patch->'conditions_treated', '[]'::jsonb)) value;
    if cardinality(v_conditions) > 20 or exists (
      select 1 from unnest(v_conditions) id
      where not exists (select 1 from public.conditions c where c.id = id)
    ) then
      raise exception 'Conditions treated must contain at most 20 known conditions' using errcode = '22023';
    end if;
  end if;

  insert into public.provider_practitioner_details (
    provider_id, hcp_verification_id, consult_modes, home_visit_radius_km, languages,
    specialty, years_experience, conditions_treated
  ) values (
    p_provider_id, v_hcp_id, v_modes, v_radius, v_languages,
    v_specialty, v_years, coalesce(v_conditions, '{}')
  )
  on conflict (provider_id) do update set
    hcp_verification_id = excluded.hcp_verification_id,
    consult_modes = excluded.consult_modes,
    home_visit_radius_km = excluded.home_visit_radius_km,
    languages = excluded.languages,
    specialty = case when p_patch ? 'specialty' then excluded.specialty else public.provider_practitioner_details.specialty end,
    years_experience = case when p_patch ? 'years_experience' then excluded.years_experience else public.provider_practitioner_details.years_experience end,
    conditions_treated = case when p_patch ? 'conditions_treated' then excluded.conditions_treated else public.provider_practitioner_details.conditions_treated end;
end;
$$;

create or replace function public.get_my_practitioner_workspace(p_provider_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_provider_member(p_provider_id, 'settings.manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'consult_modes', coalesce(d.consult_modes, array['clinic']::text[]),
      'home_visit_radius_km', d.home_visit_radius_km,
      'languages', coalesce(d.languages, array['en']::text[]),
      'specialty', d.specialty,
      'years_experience', d.years_experience,
      'conditions_treated', coalesce(d.conditions_treated, '{}'),
      'verification', case when h.id is null then null else jsonb_build_object(
        'id', h.id, 'license_type', h.license_type, 'license_number', h.license_number,
        'issuing_body', h.issuing_body, 'license_expiry', h.license_expiry,
        'specialty', h.specialty, 'verification_status', h.verification_status
      ) end
    )
    from public.providers p
    left join public.provider_practitioner_details d on d.provider_id = p.id
    left join public.hcp_verifications h on h.id = d.hcp_verification_id
    where p.id = p_provider_id and p.kind = 'practitioner'
  );
end;
$$;

create or replace function public.set_my_affiliation_visibility(p_member_id uuid, p_visible boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.provider_members m
    where m.id = p_member_id and m.user_id = (select auth.uid())
  ) or not exists (
    select 1 from public.providers p
    join public.provider_types pt on pt.key = p.provider_type
    where p.owner_id = (select auth.uid()) and p.status = 'active' and pt.listing_entity = 'person'
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  update public.provider_members set show_affiliation = p_visible, updated_at = now()
  where id = p_member_id;
end;
$$;

create or replace function public.get_my_affiliations()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'member_id', m.id, 'provider_id', p.id, 'name', p.name, 'type_label', pt.label,
    'job_title', m.job_title, 'show_affiliation', m.show_affiliation
  ) order by p.name), '[]'::jsonb)
  from public.provider_members m
  join public.providers p on p.id = m.provider_id
  join public.provider_types pt on pt.key = p.provider_type
  where m.user_id = (select auth.uid()) and m.status = 'active';
$$;

revoke all on function public.upsert_my_practitioner_details(uuid, jsonb) from public, anon;
revoke all on function public.get_my_practitioner_workspace(uuid) from public, anon;
revoke all on function public.set_my_affiliation_visibility(uuid, boolean) from public, anon;
revoke all on function public.get_my_affiliations() from public, anon;
grant execute on function public.upsert_my_practitioner_details(uuid, jsonb),
  public.get_my_practitioner_workspace(uuid), public.set_my_affiliation_visibility(uuid, boolean),
  public.get_my_affiliations() to authenticated, service_role;

notify pgrst, 'reload schema';
