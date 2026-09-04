-- =============================================================================
-- Paged, searchable, counted reader for one body-part content kind.
--
-- Companion to the capped get_anatomy_body_part_bundle(): the bundle gives
-- counts plus a 20-item preview, this pages the rest. Premium gating is
-- identical to the bundle's.
--
-- kinds: conditions | symptoms | healthy_living | workouts | drugs
-- returns: { items, total, has_more, limit, offset }
-- =============================================================================

begin;

create or replace function public.get_anatomy_body_part_items(
  p_body_part_id uuid,
  p_kind         text,
  p_gender       text default 'shared',
  p_search       text default null,
  p_limit        int  default 20,
  p_offset       int  default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_items      jsonb;
  v_total      bigint;
  v_limit      int := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_offset     int := greatest(coalesce(p_offset, 0), 0);
  v_search     text := nullif(btrim(coalesce(p_search, '')), '');
  v_is_locked  boolean;
  v_is_premium boolean;
begin
  if p_kind not in ('conditions','symptoms','healthy_living','workouts','drugs') then
    raise exception 'unknown kind: %', p_kind;
  end if;

  -- Same premium gate as get_anatomy_body_part_bundle.
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
      return jsonb_build_object(
        'items', '[]'::jsonb, 'total', 0, 'has_more', false, 'premium_locked', true
      );
    end if;
  end if;

  if p_kind = 'conditions' then
    with rows as (
      select cd.id, cd.name, cd.slug, cd.severity, cd.specialist, cd.icd11_code, cd.image_url
      from public.condition_body_parts cbp
      join public.conditions cd on cd.id = cbp.condition_id
      where cbp.body_part_id = p_body_part_id
        and (cd.status is null or cd.status = 'published')
        and (v_search is null or cd.name ilike '%' || v_search || '%')
    )
    select coalesce(jsonb_agg(to_jsonb(p) order by p.name), '[]'::jsonb),
           (select count(*) from rows)
      into v_items, v_total
    from (select * from rows order by name offset v_offset limit v_limit) p;

  elsif p_kind = 'symptoms' then
    with rows as (
      select sy.id, sy.name, sy.slug, sy.severity, sy.is_systemic, sy.specialist, sy.image_url
      from public.symptom_body_parts sbp
      join public.symptoms sy on sy.id = sbp.symptom_id
      where sbp.body_part_id = p_body_part_id
        and (sy.status is null or sy.status = 'published')
        and (v_search is null or sy.name ilike '%' || v_search || '%')
    )
    select coalesce(jsonb_agg(to_jsonb(p) order by p.name), '[]'::jsonb),
           (select count(*) from rows)
      into v_items, v_total
    from (select * from rows order by name offset v_offset limit v_limit) p;

  elsif p_kind = 'healthy_living' then
    with rows as (
      select hl.id, hl.name, hl.slug, hl.description, hl.image_url
      from public.healthy_living_body_parts hlb
      join public.healthy_living_info hl on hl.id = hlb.tip_id
      where hlb.body_part_id = p_body_part_id
        and (hl.status is null or hl.status = 'published')
        and (v_search is null or hl.name ilike '%' || v_search || '%')
    )
    select coalesce(jsonb_agg(to_jsonb(p) order by p.name), '[]'::jsonb),
           (select count(*) from rows)
      into v_items, v_total
    from (select * from rows order by name offset v_offset limit v_limit) p;

  elsif p_kind = 'workouts' then
    with rows as (
      select wk.id, wk.exercise_name as name, wk.category, wk.primary_muscle_group,
             wk.difficulty_level, wk.equipment_required, wk.thumbnail_url
      from public.fitness_body_parts fbp
      join public.fitness_exercises wk on wk.id = fbp.workout_id
      where fbp.body_part_id = p_body_part_id
        and wk.is_active = true
        and (v_search is null or wk.exercise_name ilike '%' || v_search || '%')
    )
    select coalesce(jsonb_agg(to_jsonb(p) order by p.name), '[]'::jsonb),
           (select count(*) from rows)
      into v_items, v_total
    from (select * from rows order by name offset v_offset limit v_limit) p;

  else -- drugs
    with rows as (
      select dr.id, dr.name, dr.generic_name, dr.slug, dr.category, dr.availability,
             dr.dosage_form, dr.strength, dr.strength_unit
      from public.drug_body_parts dbp
      join public.drugs dr on dr.id = dbp.drug_id
      where dbp.body_part_id = p_body_part_id
        and dr.status = 'active'
        and (v_search is null
             or dr.name ilike '%' || v_search || '%'
             or dr.generic_name ilike '%' || v_search || '%')
    )
    select coalesce(jsonb_agg(to_jsonb(p) order by p.name), '[]'::jsonb),
           (select count(*) from rows)
      into v_items, v_total
    from (select * from rows order by name offset v_offset limit v_limit) p;
  end if;

  return jsonb_build_object(
    'items',    v_items,
    'total',    v_total,
    'has_more', (v_offset + v_limit) < v_total,
    'limit',    v_limit,
    'offset',   v_offset
  );
end;
$function$;

comment on function public.get_anatomy_body_part_items(uuid, text, text, text, int, int) is
  'Paged, searchable reader for one body-part content kind. Use instead of '
  'reading the whole get_anatomy_body_part_bundle payload when a list is long.';

revoke all on function public.get_anatomy_body_part_items(uuid, text, text, text, int, int) from anon;
grant execute on function public.get_anatomy_body_part_items(uuid, text, text, text, int, int) to authenticated;

commit;

commit;
