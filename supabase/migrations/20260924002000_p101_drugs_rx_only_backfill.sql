-- P1-01 bullet 3 · First-pass review of drugs.is_prescription_only
--
-- ── What the handover expected, and what is actually there ─────────────────
--
-- The plan was to backfill "from `drugs.category` and `atc_code` where it is
-- unambiguous". **`atc_code` is NULL on all 3,151 rows**, so half of that plan
-- cannot run: ATC class would have been the more reliable signal, and it does
-- not exist yet. This backfill therefore uses `category` alone, and is a
-- conservative first pass, not a clinical review.
--
-- ── The mapping, and why each line is where it is ─────────────────────────
--
-- true  (649 rows) — categories where every member is prescription-only in
--   Ghana: Antibiotics (dispensing without a prescription is what antimicrobial
--   stewardship rules exist to stop), Antihypertensives & Cardiovascular,
--   Antidiabetics, Antiretrovirals.
--
-- false (679 rows) — Vitamins & Supplements. Confirmed over-the-counter.
--
-- NULL  (1,823 rows) — LEFT UNREVIEWED ON PURPOSE:
--   · Other (1,466) — a bucket, not a category. Says nothing either way.
--   · Analgesics (256) — the category spans paracetamol and tramadol. Marking
--     the whole class either way would be wrong for a large part of it.
--   · Antifungals (70) — topical clotrimazole is OTC, oral fluconazole is not.
--   · Antimalarials (31) — ACTs are widely and legally sold over the counter
--     here, but not all of them are. Not a call to make in a migration.
--
-- NULL means "nobody has checked", and the application already treats it as
-- "not confirmed OTC" rather than as OTC. **These 1,823 rows want a
-- pharmacist's review**; that review is the thing this file cannot substitute
-- for, and the three named categories above are where it should start.
--
-- ── Idempotent by design ─────────────────────────────────────────────────
--
-- Both statements are guarded with `is_prescription_only is null`, so a re-run
-- never overwrites a value someone reviewed by hand. That matters more than it
-- looks: the point of the column is to record human judgement, and a backfill
-- that stamped over it would quietly destroy exactly the data it exists to
-- collect.
--
-- Also included: search_drug_names() returns the flag, so the patient's drug
-- picker can mark an item "Prescription only" instead of silently offering it as
-- OTC. RETURNS jsonb, so that is additive — no signature change.
--
-- Dry-run on prod in a rolled-back transaction, 23 Sept: 649 true / 679 false /
-- 1,823 left null, and the unreviewed remainder was exactly the four categories
-- named above.

update public.drugs set is_prescription_only = true
where is_prescription_only is null
  and category in ('Antibiotics', 'Antihypertensives & Cardiovascular',
                   'Antidiabetics', 'Antiretrovirals');

update public.drugs set is_prescription_only = false
where is_prescription_only is null
  and category = 'Vitamins & Supplements';

-- The picker needs to see the flag.
do $patch$
declare src text; newsrc text; n int; anchor text := '''availability'', d.availability';
begin
  select prosrc into src from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname = 'public' and p.proname = 'search_drug_names';
  if src is null then raise exception 'search_drug_names() not found'; end if;
  n := (length(src) - length(replace(src, anchor, ''))) / length(anchor);
  if n <> 1 then
    raise exception 'search_drug_names: anchor found % times, expected 1', n;
  end if;
  newsrc := replace(src, anchor,
    anchor || ',' || chr(10) || '          ''is_prescription_only'', d.is_prescription_only');
  execute format(
    'create or replace function public.search_drug_names(p_q text) returns jsonb '
    || 'language plpgsql stable security definer set search_path to ''public'' as %L',
    newsrc);
end $patch$;
