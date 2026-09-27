drop function if exists public.get_my_affiliations();
drop function if exists public.set_my_affiliation_visibility(uuid, boolean);
alter table public.provider_members drop column if exists show_affiliation;
alter table public.provider_practitioner_details
  drop column if exists conditions_treated,
  drop column if exists years_experience,
  drop column if exists specialty;
notify pgrst, 'reload schema';
