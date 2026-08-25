-- ============================================================================
-- Human Anatomy mobile feature (Gap Analysis Part AL)
--
-- Powers the mobile 3D anatomy explorer:
--   1. anatomy_regions        — canonical region vocabulary + camera presets
--   2. anatomy_hotspots_3d    — 3D pin anchors (model-space coordinates)
--   3. fitness_body_parts     — Fitness ↔ body-part junction (was missing)
--   4. get_anatomy_region_content() — one-call content aggregation per region
--   5. log_anatomy_interaction()    — mobile tap telemetry (action-typed)
--   6. ai_body_part_mappings  — AI pin-mapper audit/review queue
--
-- Scene coordinate system (shared with the WebView scene engine):
--   height 200 units, feet at y=0, top of head y≈200, x lateral, z depth
--   (+z = front). Seed coordinates below target the Phase-0 placeholder
--   mannequin; admins refine them via the 3D Pin Placement editor.
--
-- All statements are additive and idempotent-safe (guarded).
-- ============================================================================

-- ── 1. Region vocabulary + camera presets ──────────────────────────────────

create table if not exists public.anatomy_regions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  target_x numeric not null default 0,
  target_y numeric not null default 120,
  target_z numeric not null default 0,
  zoom numeric not null default 2.2,
  default_yaw numeric not null default 0,   -- degrees; 180 = back view
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.anatomy_regions (key, label, target_x, target_y, target_z, zoom, default_yaw, display_order) values
  ('head',       'Head',            0, 188,  2, 3.0,   0, 1),
  ('neck',       'Neck & Throat',   0, 170,  2, 2.6,   0, 2),
  ('chest',      'Chest',           0, 144,  4, 2.3,   0, 3),
  ('abdomen',    'Abdomen',         0, 119,  4, 2.3,   0, 4),
  ('pelvis',     'Pelvis',          0, 101,  2, 2.3,   0, 5),
  ('arm_left',   'Left Arm',      -27, 128,  0, 2.2,   0, 6),
  ('arm_right',  'Right Arm',      27, 128,  0, 2.2,   0, 7),
  ('hand_left',  'Left Hand',     -28,  92,  0, 2.6,   0, 8),
  ('hand_right', 'Right Hand',     28,  92,  0, 2.6,   0, 9),
  ('leg_left',   'Left Leg',      -10,  62,  0, 2.0,   0, 10),
  ('leg_right',  'Right Leg',      10,  62,  0, 2.0,   0, 11),
  ('foot_left',  'Left Foot',     -10,   8,  4, 2.6,   0, 12),
  ('foot_right', 'Right Foot',     10,   8,  4, 2.6,   0, 13),
  ('back',       'Back & Spine',    0, 130, -6, 2.0, 180, 14)
on conflict (key) do nothing;

-- ── 2. 3D pin anchors ───────────────────────────────────────────────────────

create table if not exists public.anatomy_hotspots_3d (
  id uuid primary key default gen_random_uuid(),
  body_part_id uuid not null references public.body_parts(id) on delete cascade,
  region_key text not null references public.anatomy_regions(key) on delete cascade,
  gender text not null default 'shared'
    check (gender in ('female','male','shared')),
  x numeric not null default 0,
  y numeric not null default 120,
  z numeric not null default 0,
  display_order int not null default 0,
  source text not null default 'manual',  -- manual | ai | seed
  created_at timestamptz not null default now(),
  unique (body_part_id, gender)
);

create index if not exists anatomy_hotspots_3d_region_idx
  on public.anatomy_hotspots_3d (region_key);

-- ── 3. Fitness ↔ body-part junction (closes the association gap) ───────────

create table if not exists public.fitness_body_parts (
  workout_id uuid not null references public.fitness_exercises(id) on delete cascade,
  body_part_id uuid not null references public.body_parts(id) on delete cascade,
  source text not null default 'manual',  -- manual | ai
  created_at timestamptz not null default now(),
  primary key (workout_id, body_part_id)
);

-- Track provenance on the pre-existing junctions too (AI-mapped vs manual).
alter table public.condition_body_parts
  add column if not exists source text not null default 'manual';
alter table public.symptom_body_parts
  add column if not exists source text not null default 'manual';
alter table public.healthy_living_body_parts
  add column if not exists source text not null default 'manual';

-- ── 4. Action-typed interaction telemetry ──────────────────────────────────

alter table public.anatomy_interactions
  add column if not exists action text not null default 'part_tap';

create or replace function public.log_anatomy_interaction(
  p_body_part_id uuid,
  p_action text default 'part_tap'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.anatomy_interactions (user_id, body_part_id, source, action)
  values (auth.uid(), p_body_part_id, 'mobile',
          coalesce(nullif(p_action, ''), 'part_tap'));
  return true;
exception when others then
  -- Telemetry must never break the explorer UX.
  return false;
end;
$$;

revoke all on function public.log_anatomy_interaction(uuid, text) from public;
grant execute on function public.log_anatomy_interaction(uuid, text) to authenticated;

-- ── 5. One-call region content aggregation (mobile) ────────────────────────
-- Returns every 3D pin for the region + gender, each carrying its published
-- conditions / symptoms / healthy-living tips / active workouts. A part with
-- zero linked content is omitted (no pin shown).

create or replace function public.get_anatomy_region_content(
  p_region text,
  p_gender text default 'shared'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
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

  return jsonb_build_object('region', p_region, 'parts', v_result);
end;
$$;

revoke all on function public.get_anatomy_region_content(text, text) from public;
grant execute on function public.get_anatomy_region_content(text, text) to authenticated, service_role;

-- ── 6. AI pin-mapper review queue ──────────────────────────────────────────

create table if not exists public.ai_body_part_mappings (
  id uuid primary key default gen_random_uuid(),
  content_type text not null
    check (content_type in ('condition','symptom','tip','workout')),
  content_id uuid not null,
  body_part_id uuid not null references public.body_parts(id) on delete cascade,
  confidence numeric not null default 0,
  rationale text,
  status text not null default 'proposed'
    check (status in ('proposed','approved','rejected')),
  model text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  unique (content_type, content_id, body_part_id)
);

create index if not exists ai_mappings_status_idx
  on public.ai_body_part_mappings (status, content_type);

-- ── 7. Seed 3D pins from body-part names (Phase-0 placeholder mannequin) ───
-- Fuzzy name → coordinate mapping. The 3D Pin Placement editor refines these.

insert into public.anatomy_hotspots_3d (body_part_id, region_key, gender, x, y, z, source)
select
  bp.id,
  case
    when lower(bp.name) ~ '(head|brain|face|skull|eye|ear|nose|mouth|tooth|teeth|jaw|tongue)' then 'head'
    when lower(bp.name) ~ '(throat|neck|laryn|pharyn|tonsil)' then 'neck'
    when lower(bp.name) ~ '(chest|heart|lung|breast|rib)' then 'chest'
    when lower(bp.name) ~ '(abdom|stomach|gut|bowel|intestin|liver|kidney|gallbladder|pancrea|spleen|appendix)' then 'abdomen'
    when lower(bp.name) ~ '(pelvi|hip|uterus|ovar|prostate|testi|bladder|reproduc|cervix)' then 'pelvis'
    when lower(bp.name) ~ '(shoulder|arm|elbow|forearm|wrist)' then 'arm_right'
    when lower(bp.name) ~ '(hand|finger|thumb|palm)' then 'hand_right'
    when lower(bp.name) ~ '(thigh|leg|knee|calf|shin|ankle|quad|hamstring)' then 'leg_right'
    when lower(bp.name) ~ '(foot|toe|heel|sole)' then 'foot_right'
    when lower(bp.name) ~ '(spine|back|vertebr|scapula)' then 'back'
    else null
  end,
  'shared',
  case
    when lower(bp.name) ~ '(eye)' then 0
    when lower(bp.name) ~ '(ear)' then 12
    when lower(bp.name) ~ '(heart)' then -4
    when lower(bp.name) ~ '(liver)' then 6
    when lower(bp.name) ~ '(kidney)' then 8
    when lower(bp.name) ~ '(shoulder|arm|elbow|forearm|wrist)' then 27
    when lower(bp.name) ~ '(hand|finger|thumb|palm)' then 28
    when lower(bp.name) ~ '(thigh|leg|knee|calf|shin|ankle|quad|hamstring)' then 10
    when lower(bp.name) ~ '(foot|toe|heel|sole)' then 10
    else 0
  end,
  case
    when lower(bp.name) ~ '(head|brain|face|skull)' then 192
    when lower(bp.name) ~ '(eye)' then 190
    when lower(bp.name) ~ '(ear)' then 188
    when lower(bp.name) ~ '(nose)' then 185
    when lower(bp.name) ~ '(mouth|tooth|teeth|jaw|tongue)' then 180
    when lower(bp.name) ~ '(throat|neck|laryn|pharyn|tonsil)' then 170
    when lower(bp.name) ~ '(shoulder)' then 158
    when lower(bp.name) ~ '(chest|heart|lung|breast|rib)' then 145
    when lower(bp.name) ~ '(liver|gallbladder|spleen)' then 128
    when lower(bp.name) ~ '(abdom|stomach|gut|bowel|intestin|pancrea|appendix)' then 119
    when lower(bp.name) ~ '(kidney)' then 118
    when lower(bp.name) ~ '(pelvi|hip|uterus|ovar|prostate|testi|bladder|reproduc|cervix)' then 101
    when lower(bp.name) ~ '(shoulder|arm|elbow|forearm|wrist)' then 130
    when lower(bp.name) ~ '(hand|finger|thumb|palm)' then 92
    when lower(bp.name) ~ '(thigh|quad|hamstring)' then 80
    when lower(bp.name) ~ '(knee)' then 60
    when lower(bp.name) ~ '(leg|calf|shin|ankle)' then 45
    when lower(bp.name) ~ '(foot|toe|heel|sole)' then 8
    when lower(bp.name) ~ '(spine|back|vertebr|scapula)' then 135
    else 120
  end,
  case
    when lower(bp.name) ~ '(eye|ear|nose|mouth|tooth|teeth|jaw|tongue)' then 11
    when lower(bp.name) ~ '(head|brain|face|skull)' then 8
    when lower(bp.name) ~ '(throat|neck|laryn|pharyn|tonsil)' then 6
    when lower(bp.name) ~ '(chest|breast|rib)' then 8
    when lower(bp.name) ~ '(heart|lung)' then 6
    when lower(bp.name) ~ '(abdom|stomach|gut|bowel|intestin|pancrea|appendix)' then 8
    when lower(bp.name) ~ '(liver|gallbladder|spleen)' then 7
    when lower(bp.name) ~ '(kidney)' then -4
    when lower(bp.name) ~ '(pelvi|hip|uterus|ovar|prostate|testi|bladder|reproduc|cervix)' then 4
    when lower(bp.name) ~ '(spine|back|vertebr|scapula)' then -8
    else 2
  end,
  'seed'
from public.body_parts bp
where lower(bp.name) ~ '(head|brain|face|skull|eye|ear|nose|mouth|tooth|teeth|jaw|tongue|throat|neck|laryn|pharyn|tonsil|chest|heart|lung|breast|rib|abdom|stomach|gut|bowel|intestin|liver|kidney|gallbladder|pancrea|spleen|appendix|pelvi|hip|uterus|ovar|prostate|testi|bladder|reproduc|cervix|shoulder|arm|elbow|forearm|wrist|hand|finger|thumb|palm|thigh|leg|knee|calf|shin|ankle|quad|hamstring|foot|toe|heel|sole|spine|back|vertebr|scapula)'
on conflict (body_part_id, gender) do nothing;

-- ── 8. RLS ─────────────────────────────────────────────────────────────────
-- Mobile reads regions + pins with the authenticated role; writes happen via
-- service role (admin API routes), so no INSERT/UPDATE policies are granted.

alter table public.anatomy_regions enable row level security;
alter table public.anatomy_hotspots_3d enable row level security;
alter table public.fitness_body_parts enable row level security;
alter table public.ai_body_part_mappings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'anatomy_regions' and policyname = 'anatomy_regions_auth_read'
  ) then
    create policy anatomy_regions_auth_read on public.anatomy_regions
      for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'anatomy_hotspots_3d' and policyname = 'anatomy_hotspots_3d_auth_read'
  ) then
    create policy anatomy_hotspots_3d_auth_read on public.anatomy_hotspots_3d
      for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'fitness_body_parts' and policyname = 'fitness_body_parts_auth_read'
  ) then
    create policy fitness_body_parts_auth_read on public.fitness_body_parts
      for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'ai_body_part_mappings' and policyname = 'ai_mappings_admin_read'
  ) then
    create policy ai_mappings_admin_read on public.ai_body_part_mappings
      for select to authenticated
      using (public.is_platform_admin(auth.uid()));
  end if;
end;
$$;
