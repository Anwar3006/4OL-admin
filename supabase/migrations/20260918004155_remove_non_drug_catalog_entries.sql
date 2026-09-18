-- Remove consumer products and medical accessories that were accidentally
-- imported from the pharmacy inventory source. References from real user
-- reminders/enquiries are detached so their historical text remains intact.

create temporary table non_drug_catalog_ids on commit drop as
select id
from public.drugs
where lower(btrim(coalesce(generic_name, ''))) in (
  'adidas', 'air freshener', 'arm sling', 'baby lotion', 'body spray',
  'cologne', 'deodorant', 'dog food', 'mouth freshener', 'old spice',
  'perfume', 'sling', 'slingshot', 'slingshots', 'toothpaste', 'toy', 'toys'
)
or coalesce(name, '') ~* '\marm\s+slings?\M|\mslingshots?\M'
or coalesce(name, '') ~* '\mperfumes?\M|\meau\s+de\s+(parfum|perfume|toilette)\M|\mcolognes?\M'
or coalesce(name, '') ~* '\mtoys?\M|\m(police|racing|remote(\s+control)?)\s+cars?\M'
or coalesce(name, '') ~* '\m(body|deo)\s+sprays?\M|\mdeodorants?\M|\mshower\s+gels?\M'
or coalesce(name, '') ~* '\mair\s+(fresheners?|wick)\M|\mscented\s+candles?\M'
or coalesce(name, '') ~* '\mdog\s+food\M|\mstarch\s+sprays?\M';

delete from public.drug_interaction_flags
where interaction_id in (
  select di.id
  from public.drug_interactions di
  join non_drug_catalog_ids bad
    on bad.id = di.drug_a_id or bad.id = di.drug_b_id
);

delete from public.drug_interactions di
using non_drug_catalog_ids bad
where bad.id = di.drug_a_id or bad.id = di.drug_b_id;

update public.medication_reminders mr
set drug_id = null
from non_drug_catalog_ids bad
where mr.drug_id = bad.id;

update public.medication_enquiries me
set drug_id = null
from non_drug_catalog_ids bad
where me.drug_id = bad.id;

update public.drug_verification_requests dvr
set matched_drug_id = null
from non_drug_catalog_ids bad
where dvr.matched_drug_id = bad.id;

delete from public.drugs d
using non_drug_catalog_ids bad
where d.id = bad.id;
