-- =============================================================================
-- Drug -> body-part rules engine and seed.
--
-- drugs.conditions_treated and drugs.atc_code are empty on all 3,530 rows, so
-- the only usable signals are generic_name (634 distinct values) and category
-- (9 buckets). A rule table beats a one-shot backfill: pharmacy staff can add
-- a rule and re-run apply_drug_body_part_rules() without a migration.
--
--   token     exact match on any "/"-separated token of lower(generic_name),
--             so "amlodipine/valsartan" picks up both amlodipine and valsartan
--   contains  substring of lower(generic_name), for descriptive names like
--             "prostate supplement" or "cough syrup"
--   category  fallback on drugs.category, applied ONLY to drugs that no token
--             or contains rule matched. There is deliberately no fallback for
--             category 'Other' - a wrong body part is worse than none.
--
-- Idempotent: safe to re-run.
-- =============================================================================

begin;

create table if not exists public.drug_body_part_rules (
  id             uuid primary key default gen_random_uuid(),
  rule_type      text not null check (rule_type in ('token','contains','category')),
  match_value    text not null,
  body_part_name text not null references public.body_parts(name) on update cascade,
  note           text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (rule_type, match_value, body_part_name)
);

create index if not exists drug_body_part_rules_lookup_idx
  on public.drug_body_part_rules (rule_type, match_value) where is_active;

alter table public.drug_body_part_rules enable row level security;
drop policy if exists drug_body_part_rules_read on public.drug_body_part_rules;
create policy drug_body_part_rules_read on public.drug_body_part_rules
  for select to authenticated using (true);

-- drug_body_parts was the only junction without provenance.
alter table public.drug_body_parts
  add column if not exists source text not null default 'manual';

create or replace function public.apply_drug_body_part_rules(p_only_unmapped boolean default true)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_written integer;
begin
  with candidates as (
    select d.id, lower(d.generic_name) gn, d.category
    from public.drugs d
    where d.status = 'active'
      and (
        not p_only_unmapped
        or not exists (select 1 from public.drug_body_parts x where x.drug_id = d.id)
      )
  ),
  tokens as (
    select c.id, c.gn, c.category, btrim(tok) tok
    from candidates c, lateral unnest(string_to_array(c.gn, '/')) tok
  ),
  direct as (
    select distinct t.id, r.body_part_name
    from tokens t
    join public.drug_body_part_rules r
      on r.is_active and r.rule_type = 'token' and r.match_value = t.tok
    union
    select distinct c.id, r.body_part_name
    from candidates c
    join public.drug_body_part_rules r
      on r.is_active and r.rule_type = 'contains' and c.gn like '%' || r.match_value || '%'
  ),
  fallback as (
    select distinct c.id, r.body_part_name
    from candidates c
    join public.drug_body_part_rules r
      on r.is_active and r.rule_type = 'category' and r.match_value = c.category
    where not exists (select 1 from direct dd where dd.id = c.id)
  ),
  resolved as (select * from direct union select * from fallback),
  ins as (
    insert into public.drug_body_parts (drug_id, body_part_id, source)
    select r.id, bp.id, 'rules'
    from resolved r
    join public.body_parts bp on bp.name = r.body_part_name
    on conflict (drug_id, body_part_id) do nothing
    returning 1
  )
  select count(*) into v_written from ins;
  return v_written;
end;
$function$;

revoke all on function public.apply_drug_body_part_rules(boolean) from anon, authenticated;

insert into public.drug_body_part_rules (rule_type, match_value, body_part_name) values
  ('category','Analgesics','Musculoskeletal System'),
  ('category','Antibiotics','Immune and Lymphatic'),
  ('category','Antidiabetics','Pancreas'),
  ('category','Antifungals','Skin'),
  ('category','Antihypertensives & Cardiovascular','Heart'),
  ('category','Antimalarials','Systemic Veins'),
  ('category','Antiretrovirals','Immune and Lymphatic'),
  ('category','Vitamins & Supplements','Digestive and Metabolic'),
  ('contains','alginate','Esophagus and Upper GI'),
  ('contains','antacid','Stomach'),
  ('contains','antihistamine','Immune and Lymphatic'),
  ('contains','arthri','Musculoskeletal System'),
  ('contains','artificial tears','Eyes and Vision'),
  ('contains','brain supplement','Head and Neck'),
  ('contains','cod liver oil','Heart'),
  ('contains','cold remedy','Upper Airways (Nose/Throat)'),
  ('contains','cough','Trachea and Bronchi'),
  ('contains','decongestant','Nose and Sinuses'),
  ('contains','digestive','Small and Large Intestine'),
  ('contains','eye','Eyes and Vision'),
  ('contains','eye supplement','Eyes and Vision'),
  ('contains','fertility','Reproductive Organs'),
  ('contains','heart supplement','Heart'),
  ('contains','iron supplement','Systemic Veins'),
  ('contains','liv 52','Liver and Biliary Tract'),
  ('contains','liver supplement','Liver and Biliary Tract'),
  ('contains','lozenge','Throat and Pharynx'),
  ('contains','men''s supplement','Reproductive Organs'),
  ('contains','menopause','Reproductive Organs'),
  ('contains','methyl salicylate','Musculoskeletal System'),
  ('contains','pregnancy test','Reproductive Organs'),
  ('contains','prenatal','Reproductive Organs'),
  ('contains','probiotic','Small and Large Intestine'),
  ('contains','prostate','Reproductive Organs'),
  ('contains','skin ointment','Skin'),
  ('contains','teething','Mouth and Jaw'),
  ('contains','topical analgesic','Musculoskeletal System'),
  ('contains','topical analgesic','Skin'),
  ('contains','wellwoman','Reproductive Organs'),
  ('contains','women','Reproductive Organs'),
  ('token','aceclofenac','Musculoskeletal System'),
  ('token','acetaminophen','Head and Neck'),
  ('token','acetaminophen','Musculoskeletal System'),
  ('token','acetazolamide','Bladder and Urinary Tract'),
  ('token','acetylcysteine','Trachea and Bronchi'),
  ('token','acyclovir','Mouth and Jaw'),
  ('token','acyclovir','Skin'),
  ('token','adapalene','Skin'),
  ('token','albendazole','Small and Large Intestine'),
  ('token','albuterol','Trachea and Bronchi'),
  ('token','alfacalcidol','Musculoskeletal System'),
  ('token','alfuzosin','Bladder and Urinary Tract'),
  ('token','alfuzosin','Reproductive Organs'),
  ('token','allopurinol','Foot and Toes'),
  ('token','allopurinol','Musculoskeletal System'),
  ('token','amiodarone','Heart'),
  ('token','amitriptyline','Head and Neck'),
  ('token','amlodipine','Heart'),
  ('token','amlodipine','Systemic Arteries'),
  ('token','amoxicillin','Lungs and Pleura'),
  ('token','amoxicillin','Throat and Pharynx'),
  ('token','amoxycillin','Lungs and Pleura'),
  ('token','amoxycillin','Throat and Pharynx'),
  ('token','antiseptic','Skin'),
  ('token','apixaban','Systemic Veins'),
  ('token','arbutin','Skin'),
  ('token','aripiprazole','Head and Neck'),
  ('token','artemether','Liver and Biliary Tract'),
  ('token','artemether','Systemic Veins'),
  ('token','artesunate','Systemic Veins'),
  ('token','aspirin','Systemic Arteries'),
  ('token','atenolol','Heart'),
  ('token','atorvastatin','Heart'),
  ('token','atorvastatin','Systemic Arteries'),
  ('token','atovaquone','Systemic Veins'),
  ('token','atropine','Eyes and Vision'),
  ('token','azathioprine','Immune and Lymphatic'),
  ('token','azithromycin','Lungs and Pleura'),
  ('token','bacitracin','Skin'),
  ('token','baclofen','Musculoskeletal System'),
  ('token','bendroflumethiazide','Bladder and Urinary Tract'),
  ('token','bendroflumethiazide','Heart'),
  ('token','benzoyl peroxide','Skin'),
  ('token','betamethasone','Skin'),
  ('token','bicalutamide','Reproductive Organs'),
  ('token','bimatoprost','Eyes and Vision'),
  ('token','biotin','Skin'),
  ('token','bisacodyl','Rectum and Anus'),
  ('token','bismuth subsalicylate','Stomach'),
  ('token','bisoprolol','Heart'),
  ('token','brimonidine','Eyes and Vision'),
  ('token','bromazepam','Head and Neck'),
  ('token','budesonide','Trachea and Bronchi'),
  ('token','calamine','Skin'),
  ('token','calcium','Musculoskeletal System'),
  ('token','candesartan','Heart'),
  ('token','candesartan','Systemic Arteries'),
  ('token','captopril','Heart'),
  ('token','captopril','Systemic Arteries'),
  ('token','carbamazepine','Head and Neck'),
  ('token','carbidopa','Head and Neck'),
  ('token','carbimazole','Thyroid and Parathyroid'),
  ('token','carbocisteine','Trachea and Bronchi'),
  ('token','carvedilol','Heart'),
  ('token','cefalexin','Bladder and Urinary Tract'),
  ('token','cefixime','Lungs and Pleura'),
  ('token','cefotaxime','Lungs and Pleura'),
  ('token','cefpodoxime','Lungs and Pleura'),
  ('token','ceftriaxone','Lungs and Pleura'),
  ('token','cefuroxime','Lungs and Pleura'),
  ('token','celecoxib','Musculoskeletal System'),
  ('token','cetirizine','Nose and Sinuses'),
  ('token','chloramphenicol','Eyes and Vision'),
  ('token','chlorpheniramine','Nose and Sinuses'),
  ('token','chlorpromazine','Head and Neck'),
  ('token','chondroitin','Musculoskeletal System'),
  ('token','ciprofloxacin','Bladder and Urinary Tract'),
  ('token','citalopram','Head and Neck'),
  ('token','citicholine','Head and Neck'),
  ('token','clarithromycin','Lungs and Pleura'),
  ('token','clindamycin','Skin'),
  ('token','clobetasol','Skin'),
  ('token','clomiphene','Reproductive Organs'),
  ('token','clopidogrel','Systemic Arteries'),
  ('token','clotrimazole','Skin'),
  ('token','co-codamol','Musculoskeletal System'),
  ('token','collagen','Skin'),
  ('token','cotrimoxazole','Bladder and Urinary Tract'),
  ('token','cranberry','Bladder and Urinary Tract'),
  ('token','crotamiton','Skin'),
  ('token','cyproheptadine','Immune and Lymphatic'),
  ('token','cyproterone','Reproductive Organs'),
  ('token','dapagliflozin','Pancreas'),
  ('token','desloratadine','Nose and Sinuses'),
  ('token','dexamethasone','Immune and Lymphatic'),
  ('token','dextromethorphan','Trachea and Bronchi'),
  ('token','diazepam','Head and Neck'),
  ('token','diclofenac','Musculoskeletal System'),
  ('token','digoxin','Heart'),
  ('token','dihydrocodeine','Musculoskeletal System'),
  ('token','diltiazem','Heart'),
  ('token','diphenhydramine','Immune and Lymphatic'),
  ('token','domperidone','Stomach'),
  ('token','donepezil','Head and Neck'),
  ('token','doxazosin','Bladder and Urinary Tract'),
  ('token','doxazosin','Reproductive Organs'),
  ('token','doxycycline','Lungs and Pleura'),
  ('token','doxycycline','Skin'),
  ('token','drotaverine','Small and Large Intestine'),
  ('token','dulaglutide','Pancreas'),
  ('token','duloxetine','Head and Neck'),
  ('token','empagliflozin','Pancreas'),
  ('token','enalapril','Heart'),
  ('token','enalapril','Systemic Arteries'),
  ('token','enoxaparin','Systemic Veins'),
  ('token','eplerenone','Heart'),
  ('token','erythromycin','Lungs and Pleura'),
  ('token','escitalopram','Head and Neck'),
  ('token','esomeprazole','Stomach'),
  ('token','ethinylestradiol','Reproductive Organs'),
  ('token','etoricoxib','Musculoskeletal System'),
  ('token','ezetimibe','Systemic Arteries'),
  ('token','febuxostat','Foot and Toes'),
  ('token','febuxostat','Musculoskeletal System'),
  ('token','felodipine','Heart'),
  ('token','finasteride','Reproductive Organs'),
  ('token','fish oil','Heart'),
  ('token','flecainide','Heart'),
  ('token','flucloxacillin','Skin'),
  ('token','fluconazole','Reproductive Organs'),
  ('token','fluorometholone','Eyes and Vision'),
  ('token','fluoxetine','Head and Neck'),
  ('token','fluticasone','Trachea and Bronchi'),
  ('token','folic acid','Systemic Veins'),
  ('token','formoterol','Trachea and Bronchi'),
  ('token','frusemide','Bladder and Urinary Tract'),
  ('token','frusemide','Heart'),
  ('token','fsh','Reproductive Organs'),
  ('token','furosemide','Bladder and Urinary Tract'),
  ('token','furosemide','Heart'),
  ('token','gabapentin','Head and Neck'),
  ('token','gentamicin','Eyes and Vision'),
  ('token','glibenclamide','Pancreas'),
  ('token','gliclazide','Pancreas'),
  ('token','glimepiride','Pancreas'),
  ('token','glipizide','Pancreas'),
  ('token','glucosamine','Musculoskeletal System'),
  ('token','goserelin','Reproductive Organs'),
  ('token','granisetron','Stomach'),
  ('token','griseofulvin','Skin'),
  ('token','guaifenesin','Trachea and Bronchi'),
  ('token','haloperidol','Head and Neck'),
  ('token','hcg','Reproductive Organs'),
  ('token','hctz','Bladder and Urinary Tract'),
  ('token','hctz','Heart'),
  ('token','heparin','Systemic Veins'),
  ('token','hydralazine','Systemic Arteries'),
  ('token','hydrocortisone','Skin'),
  ('token','hydroxychloroquine','Musculoskeletal System'),
  ('token','hyoscine butylbromide','Small and Large Intestine'),
  ('token','ibuprofen','Musculoskeletal System'),
  ('token','indapamide','Bladder and Urinary Tract'),
  ('token','indapamide','Heart'),
  ('token','insulin','Digestive and Metabolic'),
  ('token','insulin','Pancreas'),
  ('token','ipratropium','Trachea and Bronchi'),
  ('token','irbesartan','Heart'),
  ('token','irbesartan','Systemic Arteries'),
  ('token','iron','Systemic Veins'),
  ('token','isosorbide dinitrate','Coronary Arteries'),
  ('token','isotretinoin','Skin'),
  ('token','itraconazole','Skin'),
  ('token','ivermectin','Skin'),
  ('token','ketoconazole','Skin'),
  ('token','ketoprofen','Musculoskeletal System'),
  ('token','ketotifen','Eyes and Vision'),
  ('token','labetalol','Heart'),
  ('token','lactulose','Small and Large Intestine'),
  ('token','lamotrigine','Head and Neck'),
  ('token','lansoprazole','Stomach'),
  ('token','letrozole','Breasts'),
  ('token','leuprolide','Reproductive Organs'),
  ('token','levetiracetam','Head and Neck'),
  ('token','levodopa','Head and Neck'),
  ('token','levofloxacin','Lungs and Pleura'),
  ('token','levonorgestrel','Reproductive Organs'),
  ('token','levothyroxine','Thyroid and Parathyroid'),
  ('token','lidocaine','Skin'),
  ('token','lisinopril','Heart'),
  ('token','lisinopril','Systemic Arteries'),
  ('token','lithium','Head and Neck'),
  ('token','loperamide','Small and Large Intestine'),
  ('token','loratadine','Nose and Sinuses'),
  ('token','lorazepam','Head and Neck'),
  ('token','losartan','Heart'),
  ('token','losartan','Systemic Arteries'),
  ('token','lumefantrine','Systemic Veins'),
  ('token','mebendazole','Small and Large Intestine'),
  ('token','mebeverine','Small and Large Intestine'),
  ('token','medroxyprogesterone','Reproductive Organs'),
  ('token','mefenamic acid','Reproductive Organs'),
  ('token','melatonin','Head and Neck'),
  ('token','meloxicam','Musculoskeletal System'),
  ('token','metformin','Digestive and Metabolic'),
  ('token','metformin','Pancreas'),
  ('token','methocarbamol','Musculoskeletal System'),
  ('token','methotrexate','Musculoskeletal System'),
  ('token','methyldopa','Heart'),
  ('token','methylprednisolone','Immune and Lymphatic'),
  ('token','metoclopramide','Stomach'),
  ('token','metolazone','Heart'),
  ('token','metoprolol','Heart'),
  ('token','metronidazole','Reproductive Organs'),
  ('token','metronidazole','Small and Large Intestine'),
  ('token','miconazole','Skin'),
  ('token','midazolam','Head and Neck'),
  ('token','minocycline','Skin'),
  ('token','mirtazapine','Head and Neck'),
  ('token','modafinil','Head and Neck'),
  ('token','mometasone','Skin'),
  ('token','montelukast','Trachea and Bronchi'),
  ('token','morphine','Musculoskeletal System'),
  ('token','multivitamin','Immune and Lymphatic'),
  ('token','mupirocin','Skin'),
  ('token','mycophenolate','Immune and Lymphatic'),
  ('token','naproxen','Musculoskeletal System'),
  ('token','nebivolol','Heart'),
  ('token','nefopam','Musculoskeletal System'),
  ('token','nifedipine','Heart'),
  ('token','nifedipine','Systemic Arteries'),
  ('token','nitrofurantoin','Bladder and Urinary Tract'),
  ('token','nitroglycerin','Coronary Arteries'),
  ('token','nystatin','Mouth and Jaw'),
  ('token','ofloxacin','Bladder and Urinary Tract'),
  ('token','olanzapine','Head and Neck'),
  ('token','omega-3','Heart'),
  ('token','omeprazole','Esophagus and Upper GI'),
  ('token','omeprazole','Stomach'),
  ('token','ondansetron','Stomach'),
  ('token','oxybutynin','Bladder and Urinary Tract'),
  ('token','oxytocin','Reproductive Organs'),
  ('token','pantoprazole','Stomach'),
  ('token','paracetamol','Head and Neck'),
  ('token','paracetamol','Musculoskeletal System'),
  ('token','penicillin','Throat and Pharynx'),
  ('token','perindopril','Heart'),
  ('token','perindopril','Systemic Arteries'),
  ('token','permethrin','Skin'),
  ('token','phenobarbital','Head and Neck'),
  ('token','phenylephrine','Nose and Sinuses'),
  ('token','phenytoin','Head and Neck'),
  ('token','pilocarpine','Eyes and Vision'),
  ('token','pioglitazone','Pancreas'),
  ('token','piracetam','Head and Neck'),
  ('token','piroxicam','Musculoskeletal System'),
  ('token','pizotifen','Head and Neck'),
  ('token','prednisolone','Immune and Lymphatic'),
  ('token','pregabalin','Head and Neck'),
  ('token','primidone','Head and Neck'),
  ('token','prochlorperazine','Stomach'),
  ('token','progesterone','Reproductive Organs'),
  ('token','proguanil','Systemic Veins'),
  ('token','promethazine','Immune and Lymphatic'),
  ('token','propranolol','Heart'),
  ('token','pseudoephedrine','Nose and Sinuses'),
  ('token','pyritinol','Head and Neck'),
  ('token','quetiapine','Head and Neck'),
  ('token','quinine','Systemic Veins'),
  ('token','rabeprazole','Stomach'),
  ('token','ramipril','Heart'),
  ('token','ramipril','Systemic Arteries'),
  ('token','ranitidine','Stomach'),
  ('token','ranolazine','Heart'),
  ('token','risperidone','Head and Neck'),
  ('token','rivaroxaban','Systemic Veins'),
  ('token','ropinirole','Head and Neck'),
  ('token','rosuvastatin','Heart'),
  ('token','rosuvastatin','Systemic Arteries'),
  ('token','sacubitril','Heart'),
  ('token','salbutamol','Lungs and Pleura'),
  ('token','salbutamol','Trachea and Bronchi'),
  ('token','salmeterol','Trachea and Bronchi'),
  ('token','saxagliptin','Pancreas'),
  ('token','semaglutide','Pancreas'),
  ('token','senna','Small and Large Intestine'),
  ('token','sertraline','Head and Neck'),
  ('token','sildenafil','Reproductive Organs'),
  ('token','simethicone','Stomach'),
  ('token','simvastatin','Systemic Arteries'),
  ('token','sitagliptin','Pancreas'),
  ('token','sodium bicarbonate','Stomach'),
  ('token','sodium picosulfate','Small and Large Intestine'),
  ('token','sodium valproate','Head and Neck'),
  ('token','solifenacin','Bladder and Urinary Tract'),
  ('token','sotalol','Heart'),
  ('token','spironolactone','Heart'),
  ('token','sumatriptan','Head and Neck'),
  ('token','tacrolimus','Immune and Lymphatic'),
  ('token','tadalafil','Reproductive Organs'),
  ('token','tamoxifen','Breasts'),
  ('token','tamsulosin','Bladder and Urinary Tract'),
  ('token','tamsulosin','Reproductive Organs'),
  ('token','telmisartan','Heart'),
  ('token','telmisartan','Systemic Arteries'),
  ('token','tenoxicam','Musculoskeletal System'),
  ('token','terazosin','Bladder and Urinary Tract'),
  ('token','terazosin','Reproductive Organs'),
  ('token','terbinafine','Skin'),
  ('token','tetracycline','Skin'),
  ('token','thyroxine','Thyroid and Parathyroid'),
  ('token','timolol','Eyes and Vision'),
  ('token','tizanidine','Musculoskeletal System'),
  ('token','tobramycin','Eyes and Vision'),
  ('token','tolterodine','Bladder and Urinary Tract'),
  ('token','topiramate','Head and Neck'),
  ('token','torsemide','Bladder and Urinary Tract'),
  ('token','torsemide','Heart'),
  ('token','tramadol','Musculoskeletal System'),
  ('token','tranexamic','Systemic Veins'),
  ('token','tretinoin','Skin'),
  ('token','triamcinolone','Skin'),
  ('token','trihexyphenidyl','Head and Neck'),
  ('token','ursodeoxycholic acid','Liver and Biliary Tract'),
  ('token','valproic acid','Head and Neck'),
  ('token','valsartan','Heart'),
  ('token','valsartan','Systemic Arteries'),
  ('token','venlafaxine','Head and Neck'),
  ('token','verapamil','Heart'),
  ('token','vildagliptin','Pancreas'),
  ('token','vitamin c','Immune and Lymphatic'),
  ('token','vitamin d','Musculoskeletal System'),
  ('token','warfarin','Systemic Veins'),
  ('token','xylometazoline','Nose and Sinuses'),
  ('token','zinc','Immune and Lymphatic'),
  ('token','zinc oxide','Skin'),
  ('token','zolpidem','Head and Neck')
on conflict (rule_type, match_value, body_part_name) do nothing;

-- Apply to every active drug that has no link yet.
select public.apply_drug_body_part_rules(true);

do $$
declare v_linked int; v_total int;
begin
  select count(distinct drug_id) into v_linked from public.drug_body_parts;
  select count(*) into v_total from public.drugs where status = 'active';
  raise notice 'drug_body_parts: % of % active drugs linked', v_linked, v_total;
end $$;

commit;
