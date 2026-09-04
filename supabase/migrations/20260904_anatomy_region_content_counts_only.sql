-- =============================================================================
-- get_anatomy_region_content: make the item arrays optional.
--
-- This RPC fires on every region zoom, before the reader has tapped anything,
-- and it inlined every linked item for every pin in the region purely so the
-- screen could render a `total` badge. After the exercise backfill:
--
--   back       112,066 bytes -> 1,324 with p_include_items => false
--   arm_right   99,631       -> 1,757
--   pelvis      77,796       -> 1,754
--
-- Adds a per-bucket `counts` object alongside `total`. Items for a tapped
-- part come from get_anatomy_body_part_bundle() / _items() instead.
-- Default stays true so builds already in the field are unaffected.
-- =============================================================================

begin;

drop function if exists public.get_anatomy_region_content(text, text);

create or replace function public.get_anatomy_region_content(
  p_region        text,
  p_gender        text default 'shared',
  p_include_items boolean default true
)
returns jsonb
language plpgsql
stable
security definer
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
      'conditions', case when p_include_items then coalesce(c.items, '[]'::jsonb) else '[]'::jsonb end,
      'symptoms',   case when p_include_items then coalesce(s.items, '[]'::jsonb) else '[]'::jsonb end,
      'tips',       case when p_include_items then coalesce(t.items, '[]'::jsonb) else '[]'::jsonb end,
      'workouts',   case when p_include_items then coalesce(w.items, '[]'::jsonb) else '[]'::jsonb end,
      'counts', jsonb_build_object(
        'conditions', coalesce(c.n, 0),
        'symptoms',   coalesce(s.n, 0),
        'tips',       coalesce(t.n, 0),
        'workouts',   coalesce(w.n, 0)
      ),
      'total',
        coalesce(c.n, 0) + coalesce(s.n, 0) + coalesce(t.n, 0) + coalesce(w.n, 0)
    ) as part,
    h.display_order
    from public.anatomy_hotspots_3d h
    join public.body_parts bp on bp.id = h.body_part_id
    left join lateral (
      select jsonb_agg(jsonb_build_object('id', cd.id, 'name', cd.name)
                       order by cd.name) filter (where p_include_items) as items,
             count(*) as n
      from public.condition_body_parts cbp
      join public.conditions cd on cd.id = cbp.condition_id
      where cbp.body_part_id = h.body_part_id
        and (cd.status is null or cd.status = 'published')
    ) c on true
    left join lateral (
      select jsonb_agg(jsonb_build_object('id', sy.id, 'name', sy.name)
                       order by sy.name) filter (where p_include_items) as items,
             count(*) as n
      from public.symptom_body_parts sbp
      join public.symptoms sy on sy.id = sbp.symptom_id
      where sbp.body_part_id = h.body_part_id
    ) s on true
    left join lateral (
      select jsonb_agg(jsonb_build_object('id', hl.id, 'name', hl.name)
                       order by hl.name) filter (where p_include_items) as items,
             count(*) as n
      from public.healthy_living_body_parts hlb
      join public.healthy_living_info hl on hl.id = hlb.tip_id
      where hlb.body_part_id = h.body_part_id
        and (hl.status is null or hl.status = 'published')
    ) t on true
    left join lateral (
      select jsonb_agg(jsonb_build_object('id', wk.id, 'name', wk.exercise_name)
                       order by wk.exercise_name) filter (where p_include_items) as items,
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
    from public.anatomy_regions r where r.key = p_region;

  if v_is_locked then
    select coalesce((public.get_my_entitlement() ->> 'is_premium')::boolean, false)
      into v_is_premium;
    if not v_is_premium then
      select coalesce(jsonb_agg(
        (elem - 'conditions' - 'symptoms' - 'tips' - 'workouts') || jsonb_build_object(
          'conditions', '[]'::jsonb, 'symptoms', '[]'::jsonb,
          'tips', '[]'::jsonb, 'workouts', '[]'::jsonb
        )
      ), '[]'::jsonb) into v_result
      from jsonb_array_elements(v_result) elem;
      return jsonb_build_object('region', p_region, 'parts', v_result, 'premium_locked', true);
    end if;
  end if;

  return jsonb_build_object('region', p_region, 'parts', v_result);
end;
$function$;

revoke all on function public.get_anatomy_region_content(text, text, boolean) from anon;
grant execute on function public.get_anatomy_region_content(text, text, boolean) to authenticated;

commit;
