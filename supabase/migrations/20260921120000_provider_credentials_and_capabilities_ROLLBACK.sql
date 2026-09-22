-- Rollback for 20260921120000_provider_credentials_and_capabilities.sql
begin;

drop function if exists public.get_my_provider_context();
drop function if exists public.revoke_provider_capability(uuid, text);
drop function if exists public.grant_provider_capability_override(uuid, text, text);
drop function if exists public.submit_credential(uuid, text, text, text, date, date);
drop trigger if exists trg_provider_credential_status_change on public.provider_credentials;
drop function if exists public.fn_provider_credential_status_change();
drop function if exists public.recompute_provider_verification_status(uuid);

alter table public.providers
  add column hefra_registration_number text,
  add column verification_documents jsonb default '[]'::jsonb;

update public.providers p
set hefra_registration_number = pc.number
from public.provider_credentials pc
where pc.provider_id = p.id and pc.credential_type = 'hefra_facility_licence' and pc.number !~ '^MIGRATED-';

update public.providers p
set verification_documents = coalesce((
  select jsonb_agg(pc.document_path order by pc.created_at)
  from public.provider_credentials pc
  where pc.provider_id = p.id and pc.number ~ '^MIGRATED-' and pc.document_path is not null
), '[]'::jsonb);

drop table if exists public.provider_capabilities;
drop table if exists public.provider_credentials;

commit;
