-- Gap Analysis Part AM — Anatomy premium layers & monetization (P2–P5).
--
-- Builds on 20260823_anatomy_mobile_al.sql (Part AL):
--   1. anatomy_regions.is_premium — P2 "deep-dive" region packs, admin-set
--   2. anatomy_premium_config     — admin toggle for which layers are
--      premium-gated on mobile (organs / tours / quiz / kids)
--   3. get_anatomy_premium_config() — one-call config read (fail-open)
--   4. get_anatomy_quiz() — P3 quiz questions generated from the
--      conditions ↔ body_parts junction (no AI dependency)
--
-- Premium enforcement stays client-side (useEntitlement + this config);
-- the config merely decides WHAT is gated, matching the admin
-- "Premium Layers" tab added in Part AM.

-- ── 1. Premium region flag (P2) ────────────────────────────────────────────

alter table public.anatomy_regions
  add column if not exists is_premium boolean not null default false;

comment on column public.anatomy_regions.is_premium is
  'Deep-dive region pack (Part AM P2): free users are upsold before zooming into premium regions.';

-- ── 2. Premium layer configuration ─────────────────────────────────────────

create table if not exists public.anatomy_premium_config (
  id text primary key default 'global',
  layers jsonb not null default
    '{"organs": true, "tours": true, "quiz": true, "kids": true}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.anatomy_premium_config (id)
values ('global')
on conflict (id) do nothing;

comment on table public.anatomy_premium_config is
  'Admin-controlled premium gating for the mobile anatomy explorer (Part AM). layers.{organs,tours,quiz,kids} = true means the layer requires 4OurLife Premium; false makes it free for everyone.';

-- ── 3. Config read RPC (mobile, fail-open) ─────────────────────────────────

create or replace function public.get_anatomy_premium_config()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_layers jsonb;
begin
  select coalesce(
    cfg.layers,
    '{"organs": true, "tours": true, "quiz": true, "kids": true}'::jsonb
  ) into v_layers
    from (select 1) anchor
    left join public.anatomy_premium_config cfg on cfg.id = 'global';

  return jsonb_build_object(
    'layers', v_layers,
    'premium_regions', coalesce((
      select jsonb_agg(r.key order by r.display_order)
        from public.anatomy_regions r
       where r.is_premium
    ), '[]'::jsonb)
  );
exception when others then
  -- Migration not applied yet: everything premium-gated (fail safe).
  return jsonb_build_object(
    'layers', '{"organs": true, "tours": true, "quiz": true, "kids": true}'::jsonb,
    'premium_regions', '[]'::jsonb
  );
end;
$$;

revoke all on function public.get_anatomy_premium_config() from public;
grant execute on function public.get_anatomy_premium_config() to authenticated, anon;

-- ── 4. Quiz generator (P3) ─────────────────────────────────────────────────
-- Each question: "Which body part is most affected by <condition>?" with the
-- correct body part + 3 distractors (same body system preferred). Shuffled;
-- the client locates the answer via the `correct` flag.

create or replace function public.get_anatomy_quiz(p_limit integer default 8)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 8), 15));
  v_questions jsonb := '[]'::jsonb;
  v_row record;
  v_options jsonb;
begin
  for v_row in
    select distinct on (cd.id)
           cd.id as condition_id,
           cd.name as condition_name,
           bp.id as part_id,
           bp.name as part_name,
           bp.body_system as part_system
      from public.conditions cd
      join public.condition_body_parts cbp on cbp.condition_id = cd.id
      join public.body_parts bp on bp.id = cbp.body_part_id
     where cd.status is null or cd.status = 'published'
     order by cd.id, random()
  loop
    select coalesce(jsonb_agg(o.opt order by random()), '[]'::jsonb)
      into v_options
      from (
        select jsonb_build_object('label', bp2.name, 'correct', false) as opt
          from public.body_parts bp2
         where bp2.id <> v_row.part_id
         order by (bp2.body_system is not distinct from v_row.part_system) desc,
                  random()
         limit 3
      ) o;

    v_options := v_options || jsonb_build_array(
      jsonb_build_object('label', v_row.part_name, 'correct', true)
    );

    -- Re-shuffle after appending the answer.
    select jsonb_agg(x.opt order by random()) into v_options
      from jsonb_array_elements(v_options) x(opt);

    v_questions := v_questions || jsonb_build_array(jsonb_build_object(
      'condition_id', v_row.condition_id,
      'question', v_row.condition_name,
      'options', v_options
    ));

    if jsonb_array_length(v_questions) >= v_limit then
      exit;
    end if;
  end loop;

  return jsonb_build_object('questions', v_questions);
exception when others then
  return jsonb_build_object('questions', '[]'::jsonb);
end;
$$;

revoke all on function public.get_anatomy_quiz(integer) from public;
grant execute on function public.get_anatomy_quiz(integer) to authenticated;

-- ── 5. RLS ─────────────────────────────────────────────────────────────────
-- Config is read through the RPC; admin writes use the service role.

alter table public.anatomy_premium_config enable row level security;
