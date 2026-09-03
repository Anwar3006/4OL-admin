-- Close premium-gate bypass gaps found in the pre-launch subscription audit.
--
-- Root cause: several RPCs/RLS policies trusted the client (either a
-- client-supplied payload field, or simply "the app UI doesn't call this
-- for locked content") instead of re-deriving entitlement server-side.
-- public.get_my_entitlement() already resolves premium status correctly
-- from auth.uid() (see public.submit_medication_enquiry for the reference
-- pattern this migration follows) -- these functions/policies now do the
-- same self-check instead of trusting the caller.

-- ============================================================
-- 1. Jobs: CV Boost -- apply_to_job() trusted client-supplied is_boosted
-- ============================================================
create or replace function public.apply_to_job(p_job_id uuid, p_payload jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_app_id uuid;
  v_open boolean;
  v_is_premium boolean;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated');
  end if;
  select jp.status = 'published'
         and (jp.expires_at is null or jp.expires_at > now())
    into v_open
    from public.job_postings jp
   where jp.id = p_job_id;
  if v_open is not true then
    return jsonb_build_object('ok', false, 'error', 'posting_closed');
  end if;
  if exists (
    select 1 from public.job_applications
     where job_id = p_job_id and applicant_id = auth.uid()
  ) then
    return jsonb_build_object('ok', false, 'error', 'duplicate');
  end if;
  select coalesce((public.get_my_entitlement() ->> 'is_premium')::boolean, false)
    into v_is_premium;
  insert into public.job_applications (
    job_id, applicant_id, cover_letter, resume_url,
    applicant_type, profession, specialization, years_experience_band,
    highest_qualification, skills, languages, national_id, licence_pin,
    consent, is_boosted, status
  ) values (
    p_job_id,
    auth.uid(),
    nullif(p_payload ->> 'cover_letter', ''),
    nullif(p_payload ->> 'resume_url', ''),
    case when p_payload ->> 'applicant_type' = 'non_hcp' then 'non_hcp' else 'hcp' end,
    nullif(p_payload ->> 'profession', ''),
    nullif(p_payload ->> 'specialization', ''),
    nullif(p_payload ->> 'years_experience_band', ''),
    nullif(p_payload ->> 'highest_qualification', ''),
    coalesce(
      (select array_agg(x) from jsonb_array_elements_text(coalesce(p_payload -> 'skills', '[]'::jsonb)) x),
      '{}'
    ),
    coalesce(
      (select array_agg(x) from jsonb_array_elements_text(coalesce(p_payload -> 'languages', '[]'::jsonb)) x),
      '{}'
    ),
    nullif(p_payload ->> 'national_id', ''),
    nullif(p_payload ->> 'licence_pin', ''),
    coalesce(p_payload -> 'consent', '{}'::jsonb),
    v_is_premium and coalesce((p_payload ->> 'is_boosted')::boolean, false),
    'pending'
  )
  returning id into v_app_id;
  update public.job_postings
     set application_count = coalesce(application_count, 0) + 1
   where id = p_job_id;
  return jsonb_build_object('ok', true, 'application_id', v_app_id, 'status', 'pending');
exception when unique_violation then
  return jsonb_build_object('ok', false, 'error', 'duplicate');
end;
$function$;

-- ============================================================
-- 2. Jobs: saved-jobs cap -- toggle_job_saved() had no cap at all
-- ============================================================
create or replace function public.toggle_job_saved(p_job_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_is_premium boolean;
  v_saved_count int;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'saved', false);
  end if;
  delete from public.job_saved
   where job_id = p_job_id and user_id = auth.uid();
  if found then
    return jsonb_build_object('ok', true, 'saved', false);
  end if;
  select coalesce((public.get_my_entitlement() ->> 'is_premium')::boolean, false)
    into v_is_premium;
  if not v_is_premium then
    select count(*) into v_saved_count
      from public.job_saved
     where user_id = auth.uid();
    if v_saved_count >= 3 then
      return jsonb_build_object('ok', false, 'error', 'limit', 'saved', false);
    end if;
  end if;
  insert into public.job_saved (user_id, job_id)
  values (auth.uid(), p_job_id)
  on conflict (user_id, job_id) do nothing;
  return jsonb_build_object('ok', true, 'saved', true);
end;
$function$;

-- ============================================================
-- 3. Jobs: "Open to offers" -- upsert_open_to_offers() had no check
-- ============================================================
create or replace function public.upsert_open_to_offers(p_open boolean)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_is_premium boolean;
  v_effective_open boolean;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated');
  end if;
  select coalesce((public.get_my_entitlement() ->> 'is_premium')::boolean, false)
    into v_is_premium;
  v_effective_open := coalesce(p_open, false) and v_is_premium;
  insert into public.hcp_digital_cvs (user_id, open_to_offers)
  values (auth.uid(), v_effective_open)
  on conflict (user_id) do update
    set open_to_offers = excluded.open_to_offers, updated_at = now();
  return jsonb_build_object('ok', true, 'open_to_offers', v_effective_open);
end;
$function$;

-- ============================================================
-- 4. Anatomy: premium region/body-part content had no entitlement check
-- ============================================================
create or replace function public.get_anatomy_body_part_bundle(p_body_part_id uuid, p_gender text default 'shared'::text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  v_result jsonb;
  v_is_locked boolean;
  v_is_premium boolean;
begin
  select jsonb_build_object(
    'body_part',
      case
        when bp.id is null then null
        else jsonb_build_object(
          'id', bp.id,
          'name', bp.name,
          'icon', bp.icon,
          'description', bp.description,
          'body_system', bp.body_system,
          'gender_scope', bp.gender_scope,
          'mesh_id', bp.mesh_id,
          'path', bp.path::text,
          'gender_allowed', (
            coalesce(bp.gender_scope, 'unspecified') in ('shared', 'unspecified')
            or coalesce(nullif(p_gender, ''), 'shared') = 'shared'
            or bp.gender_scope = coalesce(nullif(p_gender, ''), 'shared')
          )
        )
      end,
    'conditions', coalesce(c.items, '[]'::jsonb),
    'symptoms', coalesce(s.items, '[]'::jsonb),
    'healthy_living', coalesce(t.items, '[]'::jsonb),
    'workouts', coalesce(w.items, '[]'::jsonb),
    'drugs', coalesce(d.items, '[]'::jsonb),
    'suggested_drugs', coalesce(sd.items, '[]'::jsonb),
    'counts', jsonb_build_object(
      'conditions', coalesce(c.n, 0),
      'symptoms', coalesce(s.n, 0),
      'healthy_living', coalesce(t.n, 0),
      'workouts', coalesce(w.n, 0),
      'drugs', coalesce(d.n, 0),
      'suggested_drugs', coalesce(sd.n, 0)
    )
  )
  into v_result
  from public.body_parts bp
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'id', cd.id,
        'name', cd.name,
        'slug', cd.slug,
        'severity', cd.severity,
        'specialist', cd.specialist,
        'icd11_code', cd.icd11_code,
        'image_url', cd.image_url
      ) order by cd.name
    ) as items,
    count(*) as n
    from public.condition_body_parts cbp
    join public.conditions cd on cd.id = cbp.condition_id
    where cbp.body_part_id = bp.id
      and (cd.status is null or cd.status = 'published')
  ) c on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'id', sy.id,
        'name', sy.name,
        'slug', sy.slug,
        'severity', sy.severity,
        'is_systemic', sy.is_systemic,
        'specialist', sy.specialist,
        'image_url', sy.image_url
      ) order by sy.name
    ) as items,
    count(*) as n
    from public.symptom_body_parts sbp
    join public.symptoms sy on sy.id = sbp.symptom_id
    where sbp.body_part_id = bp.id
      and (sy.status is null or sy.status = 'published')
  ) s on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'id', hl.id,
        'name', hl.name,
        'slug', hl.slug,
        'description', hl.description,
        'image_url', hl.image_url
      ) order by hl.name
    ) as items,
    count(*) as n
    from public.healthy_living_body_parts hlb
    join public.healthy_living_info hl on hl.id = hlb.tip_id
    where hlb.body_part_id = bp.id
      and (hl.status is null or hl.status = 'published')
  ) t on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'id', wk.id,
        'name', wk.exercise_name,
        'category', wk.category,
        'difficulty_level', wk.difficulty_level,
        'thumbnail_url', wk.thumbnail_url
      ) order by wk.exercise_name
    ) as items,
    count(*) as n
    from public.fitness_body_parts fbp
    join public.fitness_exercises wk on wk.id = fbp.workout_id
    where fbp.body_part_id = bp.id
      and wk.is_active = true
  ) w on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'id', dr.id,
        'name', dr.name,
        'generic_name', dr.generic_name,
        'slug', dr.slug,
        'category', dr.category,
        'availability', dr.availability,
        'dosage_form', dr.dosage_form,
        'strength', dr.strength,
        'strength_unit', dr.strength_unit,
        'active_ingredients', coalesce(to_jsonb(dr.active_ingredients), '[]'::jsonb),
        'relation_source', 'direct'
      ) order by dr.name
    ) as items,
    count(*) as n
    from public.drug_body_parts dbp
    join public.drugs dr on dr.id = dbp.drug_id
    where dbp.body_part_id = bp.id
      and dr.status = 'active'
  ) d on true
  left join lateral (
    with linked_conditions as (
      select lower(cd.name) as condition_name
      from public.condition_body_parts cbp
      join public.conditions cd on cd.id = cbp.condition_id
      where cbp.body_part_id = bp.id
        and cd.name is not null
        and (cd.status is null or cd.status = 'published')
    ), inferred as (
      select distinct dr.*
      from public.drugs dr
      where dr.status = 'active'
        and dr.conditions_treated is not null
        and exists (
          select 1
          from unnest(dr.conditions_treated) treated(condition_name)
          join linked_conditions lc
            on lower(treated.condition_name) = lc.condition_name
        )
        and not exists (
          select 1
          from public.drug_body_parts direct
          where direct.drug_id = dr.id
            and direct.body_part_id = bp.id
        )
    )
    select jsonb_agg(
      jsonb_build_object(
        'id', inferred.id,
        'name', inferred.name,
        'generic_name', inferred.generic_name,
        'slug', inferred.slug,
        'category', inferred.category,
        'availability', inferred.availability,
        'dosage_form', inferred.dosage_form,
        'strength', inferred.strength,
        'strength_unit', inferred.strength_unit,
        'active_ingredients', coalesce(to_jsonb(inferred.active_ingredients), '[]'::jsonb),
        'relation_source', 'condition_inferred'
      ) order by inferred.name
    ) as items,
    count(*) as n
    from inferred
  ) sd on true
  where bp.id = p_body_part_id;

  v_result := coalesce(v_result, jsonb_build_object(
    'body_part', null,
    'conditions', '[]'::jsonb,
    'symptoms', '[]'::jsonb,
    'healthy_living', '[]'::jsonb,
    'workouts', '[]'::jsonb,
    'drugs', '[]'::jsonb,
    'suggested_drugs', '[]'::jsonb,
    'counts', jsonb_build_object(
      'conditions', 0,
      'symptoms', 0,
      'healthy_living', 0,
      'workouts', 0,
      'drugs', 0,
      'suggested_drugs', 0
    )
  ));

  select exists (
    select 1
    from public.anatomy_hotspots_3d h
    join public.anatomy_regions r on r.key = h.region_key
    where h.body_part_id = p_body_part_id
      and r.is_premium
  ) into v_is_locked;

  if v_is_locked then
    select coalesce((public.get_my_entitlement() ->> 'is_premium')::boolean, false)
      into v_is_premium;
    if not v_is_premium then
      v_result := v_result || jsonb_build_object(
        'conditions', '[]'::jsonb,
        'symptoms', '[]'::jsonb,
        'healthy_living', '[]'::jsonb,
        'workouts', '[]'::jsonb,
        'drugs', '[]'::jsonb,
        'suggested_drugs', '[]'::jsonb,
        'premium_locked', true
      );
    end if;
  end if;

  return v_result;
end;
$function$;

create or replace function public.get_anatomy_region_content(p_region text, p_gender text default 'shared'::text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  v_result jsonb;
  v_is_locked boolean;
  v_is_premium boolean;
begin
  select coalesce(jsonb_agg(part), '[]'::jsonb) into v_result
  from (
    select jsonb_build_object(
      'body_part_id', h.body_part_id,
      'name', bp.name,
      'icon', bp.icon,
      'body_system', bp.body_system,
      'region', h.region_key,
      'x', h.x, 'y', h.y, 'z', h.z,
      'conditions', coalesce(c.items, '[]'::jsonb),
      'symptoms',   coalesce(s.items, '[]'::jsonb),
      'tips',       coalesce(t.items, '[]'::jsonb),
      'workouts',   coalesce(w.items, '[]'::jsonb),
      'total',
        coalesce(c.n, 0) + coalesce(s.n, 0) + coalesce(t.n, 0) + coalesce(w.n, 0)
    ) as part,
    h.display_order
    from public.anatomy_hotspots_3d h
    join public.body_parts bp on bp.id = h.body_part_id
    left join lateral (
      select jsonb_agg(jsonb_build_object('id', cd.id, 'name', cd.name)
                       order by cd.name) as items,
             count(*) as n
      from public.condition_body_parts cbp
      join public.conditions cd on cd.id = cbp.condition_id
      where cbp.body_part_id = h.body_part_id
        and (cd.status is null or cd.status = 'published')
    ) c on true
    left join lateral (
      select jsonb_agg(jsonb_build_object('id', sy.id, 'name', sy.name)
                       order by sy.name) as items,
             count(*) as n
      from public.symptom_body_parts sbp
      join public.symptoms sy on sy.id = sbp.symptom_id
      where sbp.body_part_id = h.body_part_id
    ) s on true
    left join lateral (
      select jsonb_agg(jsonb_build_object('id', hl.id, 'name', hl.name)
                       order by hl.name) as items,
             count(*) as n
      from public.healthy_living_body_parts hlb
      join public.healthy_living_info hl on hl.id = hlb.tip_id
      where hlb.body_part_id = h.body_part_id
        and (hl.status is null or hl.status = 'published')
    ) t on true
    left join lateral (
      select jsonb_agg(jsonb_build_object('id', wk.id, 'name', wk.exercise_name)
                       order by wk.exercise_name) as items,
             count(*) as n
      from public.fitness_body_parts fbp
      join public.fitness_exercises wk on wk.id = fbp.workout_id
      where fbp.body_part_id = h.body_part_id
        and wk.is_active = true
    ) w on true
    where h.region_key = p_region
      and h.gender in ('shared', coalesce(nullif(p_gender, ''), 'shared'))
      and (coalesce(c.n, 0) + coalesce(s.n, 0) + coalesce(t.n, 0) + coalesce(w.n, 0)) > 0
    order by h.display_order, bp.name
  ) part;

  select coalesce(r.is_premium, false) into v_is_locked
    from public.anatomy_regions r
   where r.key = p_region;

  if v_is_locked then
    select coalesce((public.get_my_entitlement() ->> 'is_premium')::boolean, false)
      into v_is_premium;
    if not v_is_premium then
      select coalesce(jsonb_agg(
        (elem - 'conditions' - 'symptoms' - 'tips' - 'workouts') || jsonb_build_object(
          'conditions', '[]'::jsonb,
          'symptoms', '[]'::jsonb,
          'tips', '[]'::jsonb,
          'workouts', '[]'::jsonb
        )
      ), '[]'::jsonb) into v_result
      from jsonb_array_elements(v_result) elem;
      return jsonb_build_object('region', p_region, 'parts', v_result, 'premium_locked', true);
    end if;
  end if;

  return jsonb_build_object('region', p_region, 'parts', v_result);
end;
$function$;

-- ============================================================
-- 5. Fitness plan content -- SELECT was open to any authenticated user
--    regardless of fitness_plans.is_premium, and self-assignment to a
--    premium plan wasn't checked either.
-- ============================================================
drop policy if exists "Authenticated users can read plans" on public.fitness_plans;
create policy "fitness_plans_read_gated" on public.fitness_plans
  for select
  using (
    coalesce(is_premium, false) = false
    or is_admin()
    or coalesce((public.get_my_entitlement() ->> 'is_premium')::boolean, false)
    or exists (
      select 1 from public.fitness_user_assignments fua
      where fua.plan_id = fitness_plans.id
        and fua.user_id::text = (auth.jwt() ->> 'sub')
    )
  );

drop policy if exists "Authenticated users can read plan days" on public.fitness_plan_days;
create policy "fitness_plan_days_read_gated" on public.fitness_plan_days
  for select
  using (
    exists (
      select 1 from public.fitness_plans fp
      where fp.id = fitness_plan_days.plan_id
        and (
          coalesce(fp.is_premium, false) = false
          or is_admin()
          or coalesce((public.get_my_entitlement() ->> 'is_premium')::boolean, false)
          or exists (
            select 1 from public.fitness_user_assignments fua
            where fua.plan_id = fp.id
              and fua.user_id::text = (auth.jwt() ->> 'sub')
          )
        )
    )
  );

drop policy if exists "Authenticated users can read plan exercises" on public.fitness_plan_exercises;
create policy "fitness_plan_exercises_read_gated" on public.fitness_plan_exercises
  for select
  using (
    exists (
      select 1 from public.fitness_plans fp
      where fp.id = fitness_plan_exercises.plan_id
        and (
          coalesce(fp.is_premium, false) = false
          or is_admin()
          or coalesce((public.get_my_entitlement() ->> 'is_premium')::boolean, false)
          or exists (
            select 1 from public.fitness_user_assignments fua
            where fua.plan_id = fp.id
              and fua.user_id::text = (auth.jwt() ->> 'sub')
          )
        )
    )
  );

drop policy if exists "Users can insert their own plan assignments" on public.fitness_user_assignments;
create policy "fitness_user_assignments_insert_gated" on public.fitness_user_assignments
  for insert
  with check (
    (auth.jwt() ->> 'sub') = (user_id)::text
    and exists (
      select 1 from public.fitness_plans fp
      where fp.id = fitness_user_assignments.plan_id
        and (
          coalesce(fp.is_premium, false) = false
          or coalesce((public.get_my_entitlement() ->> 'is_premium')::boolean, false)
        )
    )
  );

-- ============================================================
-- 6. Period Tracker enhanced features -- writes weren't entitlement-gated.
--    Reads stay owner-scoped and unrestricted (users keep access to their
--    own historical data even if premium lapses; auto_lock_on_expiry
--    governs feature availability in the app, not data retention).
-- ============================================================
drop policy if exists "owner_access" on public.period_ttc_profiles;
create policy "owner_read" on public.period_ttc_profiles
  for select using (user_id = auth.uid());
create policy "owner_write" on public.period_ttc_profiles
  for insert with check (
    user_id = auth.uid()
    and coalesce((public.get_my_entitlement() ->> 'period_premium')::boolean, false)
  );
create policy "owner_update" on public.period_ttc_profiles
  for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and coalesce((public.get_my_entitlement() ->> 'period_premium')::boolean, false)
  );
create policy "owner_delete" on public.period_ttc_profiles
  for delete using (user_id = auth.uid());

drop policy if exists "owner_access" on public.period_ovulation_tests;
create policy "owner_read" on public.period_ovulation_tests
  for select using (user_id = auth.uid());
create policy "owner_write" on public.period_ovulation_tests
  for insert with check (
    user_id = auth.uid()
    and coalesce((public.get_my_entitlement() ->> 'period_premium')::boolean, false)
  );
create policy "owner_update" on public.period_ovulation_tests
  for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and coalesce((public.get_my_entitlement() ->> 'period_premium')::boolean, false)
  );
create policy "owner_delete" on public.period_ovulation_tests
  for delete using (user_id = auth.uid());

drop policy if exists "owner_access" on public.period_preconception_appointments;
create policy "owner_read" on public.period_preconception_appointments
  for select using (user_id = auth.uid());
create policy "owner_write" on public.period_preconception_appointments
  for insert with check (
    user_id = auth.uid()
    and coalesce((public.get_my_entitlement() ->> 'period_premium')::boolean, false)
  );
create policy "owner_update" on public.period_preconception_appointments
  for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and coalesce((public.get_my_entitlement() ->> 'period_premium')::boolean, false)
  );
create policy "owner_delete" on public.period_preconception_appointments
  for delete using (user_id = auth.uid());

drop policy if exists "owner_access" on public.period_fertility_insights;
create policy "owner_read" on public.period_fertility_insights
  for select using (user_id = auth.uid());
create policy "owner_write" on public.period_fertility_insights
  for insert with check (
    user_id = auth.uid()
    and coalesce((public.get_my_entitlement() ->> 'period_premium')::boolean, false)
  );
create policy "owner_update" on public.period_fertility_insights
  for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and coalesce((public.get_my_entitlement() ->> 'period_premium')::boolean, false)
  );
create policy "owner_delete" on public.period_fertility_insights
  for delete using (user_id = auth.uid());
