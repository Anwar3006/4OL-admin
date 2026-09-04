-- =============================================================================
-- Anatomy: backfill healthy_living_body_parts from healthy_living_info.
--
-- The junction was empty (0 of 77 tips linked), so the `healthy_living` bucket
-- of get_anatomy_body_part_bundle() always came back empty. healthy_living_info
-- .metadata is empty on every row, so this maps on article title alone — the
-- corpus clusters hard into dental, contraception, pregnancy, drugs/alcohol and
-- weather-safety groups.
--
-- Rows are written with source='heuristic' so they can be audited or reverted
-- separately from hand-curated source='manual' rows and AI-approved source='ai'
-- rows, neither of which this migration touches.
--
-- Requires the `Breasts` body part from
-- 20260904_anatomy_breasts_and_symptom_backfill.sql — run that first.
--
-- Deliberately NOT mapped (no defensible body part): "Equipment for your baby",
-- "Managing your money", "Parental leave", "Parental responsibilities and
-- rights". These stay reachable through the Healthy Living module itself.
--
-- Idempotent: safe to re-run. Only links tips that have none.
-- =============================================================================

begin;

with unmapped as (
  select h.id, h.name
  from public.healthy_living_info h
  where (h.status is null or h.status = 'published')
    and not exists (
      select 1 from public.healthy_living_body_parts hb where hb.tip_id = h.id
    )
),
mapping (tip_name, body_part_name) as (values
  -- Dental / oral health
  ('Accessing orthodontics','Mouth and Jaw'),
  ('Broken or knocked-out tooth','Mouth and Jaw'),
  ('Coping with a fear of the dentist','Mouth and Jaw'),
  ('Dental abscess','Mouth and Jaw'),
  ('Dental emergencies','Mouth and Jaw'),
  ('Dentures (false teeth)','Mouth and Jaw'),
  ('Everything you need to know about teeth','Mouth and Jaw'),
  ('Fluoride','Mouth and Jaw'),
  ('Gum disease','Mouth and Jaw'),
  ('Taking care of your oral health','Mouth and Jaw'),
  ('Teeth cleaning guide','Mouth and Jaw'),
  ('Tooth decay','Mouth and Jaw'),
  ('Toothache','Mouth and Jaw'),
  ('Wisdom tooth removal','Mouth and Jaw'),
  ('Your child’s oral health','Mouth and Jaw'),
  ('Your dental check-up','Mouth and Jaw'),
  ('Looking after your teeth and gums in pregnancy','Mouth and Jaw'),
  ('Looking after your teeth and gums in pregnancy','Reproductive Organs'),

  -- Contraception
  ('Cap','Reproductive Organs'),
  ('Combined pill','Reproductive Organs'),
  ('Condoms','Reproductive Organs'),
  ('Contraception','Reproductive Organs'),
  ('Contraceptive implant','Reproductive Organs'),
  ('Contraceptive injection','Reproductive Organs'),
  ('Contraceptive patch','Reproductive Organs'),
  ('Copper coil (IUD)','Reproductive Organs'),
  ('Diaphragm','Reproductive Organs'),
  ('Internal condoms','Reproductive Organs'),
  ('IUS (intrauterine system)','Reproductive Organs'),
  ('Natural family planning (fertility awareness)','Reproductive Organs'),
  ('Progestogen-only pill (mini pill)','Reproductive Organs'),
  ('Sterilisation','Reproductive Organs'),
  ('Vaginal Ring','Reproductive Organs'),
  ('Vasectomy','Reproductive Organs'),
  ('Hysterectomy','Reproductive Organs'),

  -- Pregnancy
  ('Attachment and bonding during pregnancy','Reproductive Organs'),
  ('Common problems in pregnancy','Reproductive Organs'),
  ('Ectopic pregnancy','Reproductive Organs'),
  ('Health conditions before pregnancy','Reproductive Organs'),
  ('Health conditions that develop during pregnancy','Reproductive Organs'),
  ('Miscarriage','Reproductive Organs'),
  ('Sex and sexual health in pregnancy','Reproductive Organs'),
  ('Taking drugs in pregnancy','Reproductive Organs'),
  ('Taking medicines when pregnant','Reproductive Organs'),
  ('Travelling when pregnant','Reproductive Organs'),
  ('Violence and abuse in pregnancy','Reproductive Organs'),
  ('What to take with you for labour and birth','Reproductive Organs'),
  ('When pregnancy goes wrong','Reproductive Organs'),
  ('Working while pregnant','Reproductive Organs'),
  ('Alcohol and pregnancy','Reproductive Organs'),
  ('Alcohol and pregnancy','Liver and Biliary Tract'),
  ('Eating well in pregnancy','Reproductive Organs'),
  ('Eating well in pregnancy','Digestive and Metabolic'),
  ('How to prevent illness in pregnancy','Reproductive Organs'),
  ('How to prevent illness in pregnancy','Immune and Lymphatic'),
  ('Keeping active in pregnancy','Reproductive Organs'),
  ('Keeping active in pregnancy','Musculoskeletal System'),
  ('Pre-eclampsia','Reproductive Organs'),
  ('Pre-eclampsia','Cardiovascular and Circulatory'),
  ('Smoking and pregnancy','Reproductive Organs'),
  ('Smoking and pregnancy','Lungs and Pleura'),
  ('Vitamins and minerals in pregnancy','Reproductive Organs'),
  ('Vitamins and minerals in pregnancy','Digestive and Metabolic'),
  ('Your mental health and wellbeing in pregnancy','Reproductive Organs'),
  ('Your mental health and wellbeing in pregnancy','Head and Neck'),
  ('How your body prepares to feed your baby','Breasts'),
  ('How your body prepares to feed your baby','Reproductive Organs'),
  ('How to look after your pelvic floor','Hip and Pelvic Girdle'),
  ('How to look after your pelvic floor','Bladder and Urinary Tract'),

  -- Drugs and alcohol
  ('Advice if you inject drugs','Skin'),
  ('Advice if you inject drugs','Systemic Veins'),
  ('Alcohol units and drinking guidelines','Liver and Biliary Tract'),
  ('The risks of drinking too much and how to cut down','Liver and Biliary Tract'),
  ('Benzodiazepines (benzos, diazepam, valium) - Common Drugs','Head and Neck'),
  ('Cannabis - Common Drugs','Head and Neck'),
  ('Cannabis - Common Drugs','Lungs and Pleura'),
  ('Cocaine','Head and Neck'),
  ('Cocaine','Heart'),
  ('Heroin','Head and Neck'),
  ('MDMA (Ecstasy)','Head and Neck'),
  ('Synthetic cannabinoids (Spice)','Head and Neck'),
  ('Support for people affected by drugs','Head and Neck'),
  ('What you need to know about taking drugs','Head and Neck'),

  -- Weather and environment
  ('How to stay safe in hot weather','Skin'),
  ('How to stay safe in hot weather','Cardiovascular and Circulatory'),
  ('How to stay safe in cold weather','Respiratory System'),
  ('How to stay safe in cold weather','Skin'),
  ('How to protect your health when flooding occurs','Immune and Lymphatic'),
  ('How to stay safe during a drought','Bladder and Urinary Tract')
)
insert into public.healthy_living_body_parts (tip_id, body_part_id, source)
select u.id, bp.id, 'heuristic'
from mapping m
join unmapped u on u.name = m.tip_name
join public.body_parts bp on bp.name = m.body_part_name
on conflict (tip_id, body_part_id) do nothing;

do $$
declare
  v_total   int;
  v_linked  int;
  v_orphans text;
begin
  select count(*) into v_total from public.healthy_living_info
   where status is null or status = 'published';
  select count(distinct tip_id) into v_linked from public.healthy_living_body_parts;

  select string_agg(h.name, ', ' order by h.name) into v_orphans
  from public.healthy_living_info h
  where (h.status is null or h.status = 'published')
    and not exists (
      select 1 from public.healthy_living_body_parts hb where hb.tip_id = h.id
    );

  raise notice 'healthy_living_body_parts: % of % published tips linked', v_linked, v_total;
  if v_orphans is not null then
    raise notice 'not linked (expected, non-anatomical): %', v_orphans;
  end if;
end $$;

commit;
