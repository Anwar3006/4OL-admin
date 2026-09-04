-- =============================================================================
-- Cap the body-part bundle payload.
--
-- get_anatomy_body_part_bundle() inlined every linked row. After the exercise
-- backfill that is 126-133 KB of JSON for a busy body part, which the mobile
-- detail sheet waits on before rendering anything. Measured on the live DB:
-- 126,144 bytes uncapped -> 4,940 bytes with the default cap of 20.
--
-- Counts stay EXACT (they are computed over the whole set); only the inlined
-- lists are truncated, and a new `has_more` object says which buckets were.
-- Page the rest with get_anatomy_body_part_items().
--
-- p_preview_limit => null restores the old uncapped behaviour.
--
-- NOTE: the 2-arg signature is dropped and replaced by a 3-arg one with a
-- default, so existing 2-arg callers keep working. Mobile builds shipped
-- before this migration will show at most 20 items per tab with a correct
-- count and no "load more" until they are updated to call
-- get_anatomy_body_part_items().
-- =============================================================================

begin;

drop function if exists public.get_anatomy_body_part_bundle(uuid, text);

create or replace function public.get_anatomy_body_part_bundle(
  p_body_part_id  uuid,
  p_gender        text default 'shared',
  p_preview_limit int  default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_result     jsonb;
  v_is_locked  boolean;
  v_is_premium boolean;
  v_cap int := case
                 when p_preview_limit is null or p_preview_limit <= 0 then 2147483647
                 else least(p_preview_limit, 100)
               end;
begin
  select jsonb_build_object(
    'body_part',
      case
        when bp.id is null then null
        else jsonb_build_object(
          'id', bp.id, 'name', bp.name, 'icon', bp.icon, 'description', bp.description,
          'body_system', bp.body_system, 'gender_scope', bp.gender_scope,
          'mesh_id', bp.mesh_id, 'path', bp.path::text,
          'gender_allowed', (
            coalesce(bp.gender_scope, 'unspecified') in ('shared', 'unspecified')
            or coalesce(nullif(p_gender, ''), 'shared') = 'shared'
            or bp.gender_scope = coalesce(nullif(p_gender, ''), 'shared')
          )
        )
      end,
    'conditions',      coalesce(c.items,  '[]'::jsonb),
    'symptoms',        coalesce(s.items,  '[]'::jsonb),
    'healthy_living',  coalesce(t.items,  '[]'::jsonb),
    'workouts',        coalesce(w.items,  '[]'::jsonb),
    'drugs',           coalesce(d.items,  '[]'::jsonb),
    'suggested_drugs', coalesce(sd.items, '[]'::jsonb),
    'counts', jsonb_build_object(
      'conditions', coalesce(c.n,0), 'symptoms', coalesce(s.n,0),
      'healthy_living', coalesce(t.n,0), 'workouts', coalesce(w.n,0),
      'drugs', coalesce(d.n,0), 'suggested_drugs', coalesce(sd.n,0)
    ),
    'preview_limit', case when v_cap = 2147483647 then null else v_cap end,
    'has_more', jsonb_build_object(
      'conditions', coalesce(c.n,0) > v_cap, 'symptoms', coalesce(s.n,0) > v_cap,
      'healthy_living', coalesce(t.n,0) > v_cap, 'workouts', coalesce(w.n,0) > v_cap,
      'drugs', coalesce(d.n,0) > v_cap, 'suggested_drugs', coalesce(sd.n,0) > v_cap
    )
  )
  into v_result
  from public.body_parts bp
  left join lateral (
    select jsonb_agg(jsonb_build_object('id',x.id,'name',x.name,'slug',x.slug,
             'severity',x.severity,'specialist',x.specialist,'icd11_code',x.icd11_code,
             'image_url',x.image_url) order by x.name) filter (where x.rn <= v_cap) as items,
           count(*) as n
    from (
      select cd.id, cd.name, cd.slug, cd.severity, cd.specialist, cd.icd11_code, cd.image_url,
             row_number() over (order by cd.name) rn
      from public.condition_body_parts cbp
      join public.conditions cd on cd.id = cbp.condition_id
      where cbp.body_part_id = bp.id and (cd.status is null or cd.status = 'published')
    ) x
  ) c on true
  left join lateral (
    select jsonb_agg(jsonb_build_object('id',x.id,'name',x.name,'slug',x.slug,
             'severity',x.severity,'is_systemic',x.is_systemic,'specialist',x.specialist,
             'image_url',x.image_url) order by x.name) filter (where x.rn <= v_cap) as items,
           count(*) as n
    from (
      select sy.id, sy.name, sy.slug, sy.severity, sy.is_systemic, sy.specialist, sy.image_url,
             row_number() over (order by sy.name) rn
      from public.symptom_body_parts sbp
      join public.symptoms sy on sy.id = sbp.symptom_id
      where sbp.body_part_id = bp.id and (sy.status is null or sy.status = 'published')
    ) x
  ) s on true
  left join lateral (
    select jsonb_agg(jsonb_build_object('id',x.id,'name',x.name,'slug',x.slug,
             'description',x.description,'image_url',x.image_url) order by x.name)
             filter (where x.rn <= v_cap) as items,
           count(*) as n
    from (
      select hl.id, hl.name, hl.slug, hl.description, hl.image_url,
             row_number() over (order by hl.name) rn
      from public.healthy_living_body_parts hlb
      join public.healthy_living_info hl on hl.id = hlb.tip_id
      where hlb.body_part_id = bp.id and (hl.status is null or hl.status = 'published')
    ) x
  ) t on true
  left join lateral (
    select jsonb_agg(jsonb_build_object('id',x.id,'name',x.name,'category',x.category,
             'difficulty_level',x.difficulty_level,'thumbnail_url',x.thumbnail_url)
             order by x.name) filter (where x.rn <= v_cap) as items,
           count(*) as n
    from (
      select wk.id, wk.exercise_name as name, wk.category, wk.difficulty_level, wk.thumbnail_url,
             row_number() over (order by wk.exercise_name) rn
      from public.fitness_body_parts fbp
      join public.fitness_exercises wk on wk.id = fbp.workout_id
      where fbp.body_part_id = bp.id and wk.is_active = true
    ) x
  ) w on true
  left join lateral (
    select jsonb_agg(jsonb_build_object('id',x.id,'name',x.name,'generic_name',x.generic_name,
             'slug',x.slug,'category',x.category,'availability',x.availability,
             'dosage_form',x.dosage_form,'strength',x.strength,'strength_unit',x.strength_unit,
             'active_ingredients',coalesce(to_jsonb(x.active_ingredients),'[]'::jsonb),
             'relation_source','direct') order by x.name) filter (where x.rn <= v_cap) as items,
           count(*) as n
    from (
      select dr.id, dr.name, dr.generic_name, dr.slug, dr.category, dr.availability,
             dr.dosage_form, dr.strength, dr.strength_unit, dr.active_ingredients,
             row_number() over (order by dr.name) rn
      from public.drug_body_parts dbp
      join public.drugs dr on dr.id = dbp.drug_id
      where dbp.body_part_id = bp.id and dr.status = 'active'
    ) x
  ) d on true
  left join lateral (
    select jsonb_agg(jsonb_build_object('id',x.id,'name',x.name,'generic_name',x.generic_name,
             'slug',x.slug,'category',x.category,'availability',x.availability,
             'dosage_form',x.dosage_form,'strength',x.strength,'strength_unit',x.strength_unit,
             'active_ingredients',coalesce(to_jsonb(x.active_ingredients),'[]'::jsonb),
             'relation_source','condition_inferred') order by x.name)
             filter (where x.rn <= v_cap) as items,
           count(*) as n
    from (
      with linked_conditions as (
        select lower(cd.name) as condition_name
        from public.condition_body_parts cbp
        join public.conditions cd on cd.id = cbp.condition_id
        where cbp.body_part_id = bp.id and cd.name is not null
          and (cd.status is null or cd.status = 'published')
      )
      select distinct dr.id, dr.name, dr.generic_name, dr.slug, dr.category, dr.availability,
             dr.dosage_form, dr.strength, dr.strength_unit, dr.active_ingredients,
             row_number() over (order by dr.name) rn
      from public.drugs dr
      where dr.status = 'active' and dr.conditions_treated is not null
        and exists (
          select 1 from unnest(dr.conditions_treated) treated(condition_name)
          join linked_conditions lc on lower(treated.condition_name) = lc.condition_name
        )
        and not exists (
          select 1 from public.drug_body_parts direct
          where direct.drug_id = dr.id and direct.body_part_id = bp.id
        )
    ) x
  ) sd on true
  where bp.id = p_body_part_id;

  v_result := coalesce(v_result, jsonb_build_object(
    'body_part', null, 'conditions','[]'::jsonb, 'symptoms','[]'::jsonb,
    'healthy_living','[]'::jsonb, 'workouts','[]'::jsonb, 'drugs','[]'::jsonb,
    'suggested_drugs','[]'::jsonb,
    'counts', jsonb_build_object('conditions',0,'symptoms',0,'healthy_living',0,
                                 'workouts',0,'drugs',0,'suggested_drugs',0)
  ));

  select exists (
    select 1 from public.anatomy_hotspots_3d h
    join public.anatomy_regions r on r.key = h.region_key
    where h.body_part_id = p_body_part_id and r.is_premium
  ) into v_is_locked;

  if v_is_locked then
    select coalesce((public.get_my_entitlement() ->> 'is_premium')::boolean, false)
      into v_is_premium;
    if not v_is_premium then
      v_result := v_result || jsonb_build_object(
        'conditions','[]'::jsonb, 'symptoms','[]'::jsonb, 'healthy_living','[]'::jsonb,
        'workouts','[]'::jsonb, 'drugs','[]'::jsonb, 'suggested_drugs','[]'::jsonb,
        'premium_locked', true
      );
    end if;
  end if;

  return v_result;
end;
$function$;

comment on function public.get_anatomy_body_part_bundle(uuid, text, int) is
  'Body-part detail payload. Lists capped at p_preview_limit (default 20) while counts stay exact; has_more says which buckets are truncated. Page the rest with get_anatomy_body_part_items(). Pass p_preview_limit => null for the old uncapped behaviour.';

revoke all on function public.get_anatomy_body_part_bundle(uuid, text, int) from anon;
grant execute on function public.get_anatomy_body_part_bundle(uuid, text, int) to authenticated;

commit;
