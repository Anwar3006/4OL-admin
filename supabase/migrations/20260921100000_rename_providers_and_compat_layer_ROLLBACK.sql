-- Rollback for 20260921100000_rename_providers_and_compat_layer.sql
--
-- Reconstructs facility_profile as a real table again. Only safe if nothing
-- has written provider_credentials/provider_capabilities/provider_catalogue_
-- items yet (later migrations FK onto providers.id, not onto a rebuilt
-- facility_profile) — check that before running this beyond the P0-10 window.

begin;

drop view if exists public.facility_profile;

alter table public.providers add column facility_type text;
update public.providers set facility_type = provider_type;
alter table public.providers alter column facility_type set not null;

create type public.facility_type_enum as enum (
  'hospitals_&_clinics','herbal_centers','diagnostic_labs','pharmacies','dental_clinics',
  'homes','eye_clinics','osteopathy_centers','physiotherapy_centers','prosthetics_centers',
  'psychiatric_centers','ibps','health_schools'
);

alter table public.providers
  add column first_name text,
  add column last_name text,
  add column owner_email text,
  add column person_contact_number text,
  add column "position" text,
  add column admin_notes text,
  add column rejection_reason text,
  add column status_reason text;

update public.providers p
set first_name = pp.owner_first_name,
    last_name = pp.owner_last_name,
    owner_email = pp.owner_email,
    person_contact_number = pp.owner_phone,
    "position" = pp.owner_position,
    admin_notes = pp.admin_notes,
    rejection_reason = pp.rejection_reason,
    status_reason = pp.status_reason
from public.provider_private pp
where pp.provider_id = p.id;

alter table public.providers
  alter column first_name set not null,
  alter column last_name set not null,
  alter column owner_email set not null,
  alter column person_contact_number set not null,
  alter column "position" set not null;

drop table public.provider_private;

alter table public.providers drop column kind;
alter table public.providers drop column provider_type;
alter table public.providers drop column verification_status;
alter table public.providers drop column description;
alter table public.providers drop column is_online_only;

alter table public.providers rename column name to facility_name;
alter table public.providers rename to facility_profile;

drop function if exists public._resolve_legacy_provider_type(text);

drop policy if exists "providers_select_public_active" on public.facility_profile;
drop policy if exists "providers_select_authenticated" on public.facility_profile;
drop policy if exists "providers_insert_admin" on public.facility_profile;
drop policy if exists "providers_update_admin" on public.facility_profile;
drop policy if exists "providers_delete_admin" on public.facility_profile;

create policy "facility_profile_select_public_active" on public.facility_profile
  for select to anon using (status = 'active'::facility_status_enum);
create policy "facility_profile_select_active_or_admin" on public.facility_profile
  for select to authenticated using (
    (lower(status::text) = any (array['active','approved']))
    or owner_id = (select auth.uid())
    or submitted_by = (select auth.uid())
    or (select public.is_app_admin())
    or (select public.has_4ol_permission((select auth.uid()), 'facilities.view'))
  );
create policy "facility_profile_insert_admin" on public.facility_profile
  for insert to authenticated with check ((select public.is_app_admin()));
create policy "facility_profile_update_admin" on public.facility_profile
  for update to authenticated using ((select public.is_app_admin())) with check ((select public.is_app_admin()));
create policy "facility_profile_delete_admin" on public.facility_profile
  for delete to authenticated using ((select public.is_app_admin()));

-- NOTE: register_facility_with_profile, admin_change_facility_status,
-- admin_delete_facility, admin_perform_facility_review_action,
-- registrar_update_own_facility, sync_top_rated_facility_flag,
-- refresh_top_rated_snapshot and build_top_rated_module_data all need their
-- pre-migration bodies restored by hand from git history
-- (supabase/migrations/ prior to 20260921100000) — they are not repeated
-- here since a straight restore would reintroduce the facility_type_enum
-- cast and the pre-split column list verbatim.

commit;
