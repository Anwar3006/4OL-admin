-- =============================================================================
-- Anatomy: body-part path trigger, Breasts body part, symptom link backfill.
--
-- 1. body_parts.path is `ltree NOT NULL` with no default and no trigger, so
--    every insert that does not compute a path by hand fails — including
--    POST /api/anatomy/body-map (the "+ Add Body Part" button). This adds the
--    trigger that derives path/level from the parent.
--
-- 2. Adds a `Breasts` body part. The Body Map has no chest/breast region, so
--    breast and nipple symptoms had nowhere to attach, and the fitness
--    "Chest" muscle group had only Shoulder and Clavicle to fall back on.
--    gender_scope is 'shared' deliberately: "Breast swelling in men" and
--    "Nipple discharge" are not female-only symptoms.
--
-- 3. Backfills symptom_body_parts for every published symptom that currently
--    has zero body-part links (61 of 70). Rows are written with
--    source='heuristic' so they can be audited or reverted separately from
--    the hand-curated source='manual' rows, which this migration never
--    touches.
--
-- Idempotent: safe to re-run.
-- =============================================================================

begin;

-- ── 1. Derive body_parts.path / level from the parent ────────────────────────

-- ltree lives in the `extensions` schema on Supabase, so pin it on search_path
-- rather than schema-qualifying the type and operators.
create or replace function public.body_parts_set_path()
returns trigger
language plpgsql
set search_path to 'public', 'extensions'
as $$
declare
  v_parent_path extensions.ltree;
  v_segment     text;
begin
  v_segment := regexp_replace(new.name, '[^a-zA-Z0-9]', '', 'g');
  if v_segment = '' then
    raise exception 'body_parts.name must contain at least one alphanumeric character (got %)', new.name;
  end if;

  if new.parent_id is null then
    new.path  := v_segment::extensions.ltree;
    new.level := 0;
  else
    select bp.path into v_parent_path
    from public.body_parts bp
    where bp.id = new.parent_id;

    if v_parent_path is null then
      raise exception 'parent body part % not found', new.parent_id;
    end if;

    new.path  := v_parent_path || v_segment::extensions.ltree;
    new.level := nlevel(v_parent_path);
  end if;

  return new;
end;
$$;

comment on function public.body_parts_set_path() is
  'Derives body_parts.path (ltree) and level from parent_id + name. Renaming a '
  'parent does not cascade to descendant paths — re-parent children explicitly '
  'if that is ever needed.';

drop trigger if exists trg_body_parts_set_path on public.body_parts;
create trigger trg_body_parts_set_path
  before insert or update of name, parent_id on public.body_parts
  for each row execute function public.body_parts_set_path();

-- ── 2. Breasts body part ─────────────────────────────────────────────────────

insert into public.body_parts (name, parent_id, body_system, gender_scope, description)
select
  'Breasts',
  (select id from public.body_parts where name = 'Reproductive Organs'),
  'reproductive',
  'shared',
  'Breast and nipple tissue. Shared scope — breast and nipple symptoms occur in both sexes.'
on conflict (name) do nothing;

-- ── 3. Symptom → body-part backfill ──────────────────────────────────────────

with unmapped as (
  select s.id, s.name
  from public.symptoms s
  where (s.status is null or s.status = 'published')
    and not exists (
      select 1 from public.symptom_body_parts sbp where sbp.symptom_id = s.id
    )
),
mapping (symptom_name, body_part_name) as (
  values
    -- Musculoskeletal
    ('Ankle problems',                          'Lower Leg and Ankle'),
    ('Calf problems',                           'Lower Leg and Ankle'),
    ('Knee problems',                           'Knee Joint'),
    ('Hip problems',                            'Hip and Pelvic Girdle'),
    ('Foot problems',                           'Foot and Toes'),
    ('Elbow problems',                          'Elbow Joint'),
    ('Shoulder problems',                       'Shoulder and Clavicle'),
    ('Neck problems',                           'Cervical Spine (Neck)'),
    ('Back problems',                           'Thoracic Spine (Mid-back)'),
    ('Back problems',                           'Lumbar Spine (Lower-back)'),
    ('Wrist, hand, finger and thumb problems',  'Forearm and Wrist'),
    ('Wrist, hand, finger and thumb problems',  'Hand and Fingers'),
    ('Soft tissue injury advice',               'Musculoskeletal System'),
    ('Chronic pain',                            'Musculoskeletal System'),

    -- Head, neck and senses
    ('Headaches',                               'Head and Neck'),
    ('Headaches',                               'Skull and Face'),
    ('Migraine',                                'Head and Neck'),
    ('Delirium',                                'Head and Neck'),
    ('Dizziness (lightheadedness)',             'Head and Neck'),
    ('Dizziness (lightheadedness)',             'Ears and Hearing'),
    ('Vertigo',                                 'Ears and Hearing'),
    ('Tinnitus',                                'Ears and Hearing'),
    ('Earache',                                 'Ears and Hearing'),
    ('Hearing loss',                            'Ears and Hearing'),
    ('Nosebleed',                               'Nose and Sinuses'),
    ('Catarrh',                                 'Nose and Sinuses'),
    ('Hay fever',                               'Nose and Sinuses'),
    ('Hay fever',                               'Eyes and Vision'),
    ('Sore throat',                             'Throat and Pharynx'),
    ('Feeling of something in your throat (Globus)', 'Throat and Pharynx'),

    -- Mouth and jaw
    ('Mouth ulcer',                             'Mouth and Jaw'),
    ('Dry mouth',                               'Mouth and Jaw'),
    ('Cold sore',                               'Mouth and Jaw'),

    -- Respiratory
    ('Cough',                                   'Trachea and Bronchi'),
    ('Cough',                                   'Lungs and Pleura'),
    ('Breathlessness',                          'Lungs and Pleura'),
    ('Flu',                                     'Respiratory System'),
    ('Flu',                                     'Immune and Lymphatic'),

    -- Cardiovascular
    ('Cardiac arrest',                          'Heart'),
    ('Chest pain',                              'Heart'),
    ('Chest pain',                              'Lungs and Pleura'),

    -- Digestive
    ('Indigestion',                             'Stomach'),
    ('Indigestion',                             'Esophagus and Upper GI'),
    ('Stomach ache and abdominal pain',         'Stomach'),
    ('Stomach ache and abdominal pain',         'Small and Large Intestine'),
    ('Vomiting in adults',                      'Stomach'),
    ('Vomiting in children and babies',         'Stomach'),
    ('Diarrhoea in adults',                     'Small and Large Intestine'),
    ('Diarrhoea in children and babies',        'Small and Large Intestine'),
    ('Constipation',                            'Small and Large Intestine'),
    ('Constipation',                            'Rectum and Anus'),
    ('Farting',                                 'Small and Large Intestine'),
    ('Bowel incontinence',                      'Rectum and Anus'),
    ('Itchy bottom',                            'Rectum and Anus'),
    ('Dehydration',                             'Digestive and Metabolic'),

    -- Urinary and reproductive
    ('Urinary tract infection (UTI) in children', 'Bladder and Urinary Tract'),
    ('Genital symptoms',                        'Reproductive Organs'),
    ('Breast pain',                             'Breasts'),
    ('Breast swelling in men',                  'Breasts'),
    ('Nipple discharge',                        'Breasts'),
    ('Nipple inversion (inside out nipple)',    'Breasts'),

    -- Skin and trauma
    ('Blisters',                                'Skin'),
    ('Burns and scalds',                        'Skin'),
    ('Sunburn',                                 'Skin'),
    ('Cuts and grazes',                         'Skin'),
    ('Animal and human bites',                  'Skin'),
    ('Jellyfish and sea creature stings',       'Skin'),
    ('Warts and verrucas',                      'Skin'),
    ('Excessive sweating (hyperhidrosis)',      'Skin'),

    -- Systemic / immune
    ('Fever in adults',                         'Immune and Lymphatic'),
    ('Fever in children',                       'Immune and Lymphatic'),
    ('Allergies',                               'Immune and Lymphatic'),
    ('Allergies',                               'Skin')
)
insert into public.symptom_body_parts (symptom_id, body_part_id, source)
select u.id, bp.id, 'heuristic'
from mapping m
join unmapped u on u.name = m.symptom_name
join public.body_parts bp on bp.name = m.body_part_name
on conflict (body_part_id, symptom_id) do nothing;

-- ── Verification ─────────────────────────────────────────────────────────────

do $$
declare
  v_total    int;
  v_linked   int;
  v_orphans  text;
begin
  select count(*) into v_total from public.symptoms
   where status is null or status = 'published';
  select count(distinct symptom_id) into v_linked from public.symptom_body_parts;

  select string_agg(s.name, ', ' order by s.name) into v_orphans
  from public.symptoms s
  where (s.status is null or s.status = 'published')
    and not exists (
      select 1 from public.symptom_body_parts sbp where sbp.symptom_id = s.id
    );

  raise notice 'symptom_body_parts: % of % published symptoms linked', v_linked, v_total;
  if v_orphans is not null then
    raise notice 'still unlinked: %', v_orphans;
  end if;
end $$;

commit;
