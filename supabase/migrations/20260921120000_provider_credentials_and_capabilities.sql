-- =============================================================================
-- P0-11: provider_credentials + provider_capabilities, the verify/expire
-- trigger pair, verification_status recompute, submit_credential (owner) and
-- grant/revoke_provider_capability_override (admin).
--
-- Migrates providers.hefra_registration_number and verification_documents
-- into provider_credentials before dropping them — a no-op on the 3 live
-- rows today (both columns are null/empty on all of them, confirmed before
-- writing this), but the migration logic still runs for real in case that
-- changes before this applies. Each non-empty verification_documents entry
-- becomes one 'pending' credential row so nothing is silently discarded;
-- credential_type is guessed from the provider's kind (best-effort — an
-- admin can correct the type once the Credentials tab exists, P0-14).
-- =============================================================================

create table public.provider_credentials (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  credential_type text not null references public.credential_types(key),
  number text not null,
  document_path text,
  issued_at date,
  expires_at date,
  status text not null default 'pending'
    check (status in ('pending','verified','rejected','expired','revoked')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (credential_type, number)
);

create index provider_credentials_provider_id_idx on public.provider_credentials(provider_id);
create index provider_credentials_expires_at_idx on public.provider_credentials(expires_at) where status = 'verified';
create index provider_credentials_status_idx on public.provider_credentials(status);

create table public.provider_capabilities (
  provider_id uuid not null references public.providers(id) on delete cascade,
  capability text not null references public.capabilities(key),
  source text not null check (source in ('credential','admin_override')),
  credential_id uuid references public.provider_credentials(id) on delete cascade,
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  override_reason text,
  primary key (provider_id, capability),
  constraint provider_capabilities_source_shape check (
    (source = 'admin_override' and override_reason is not null and credential_id is null)
    or (source = 'credential' and credential_id is not null)
  )
);

create index provider_capabilities_credential_id_idx on public.provider_capabilities(credential_id);

alter table public.provider_credentials enable row level security;
create policy "provider_credentials owner and admin read" on public.provider_credentials
  for select to authenticated using (
    (select public.is_app_admin())
    or exists (select 1 from public.providers p where p.id = provider_credentials.provider_id and p.owner_id = (select auth.uid()))
  );
create policy "provider_credentials admin write" on public.provider_credentials
  for all to authenticated using ((select public.is_app_admin())) with check ((select public.is_app_admin()));
revoke all on public.provider_credentials from anon;
grant select on public.provider_credentials to authenticated;
grant all on public.provider_credentials to service_role;

alter table public.provider_capabilities enable row level security;
create policy "provider_capabilities owner and admin read" on public.provider_capabilities
  for select to authenticated using (
    (select public.is_app_admin())
    or exists (select 1 from public.providers p where p.id = provider_capabilities.provider_id and p.owner_id = (select auth.uid()))
  );
create policy "provider_capabilities admin write" on public.provider_capabilities
  for all to authenticated using ((select public.is_app_admin())) with check ((select public.is_app_admin()));
revoke all on public.provider_capabilities from anon;
grant select on public.provider_capabilities to authenticated;
grant all on public.provider_capabilities to service_role;

-- -----------------------------------------------------------------------------
-- Migrate hefra_registration_number / verification_documents, then drop them
-- -----------------------------------------------------------------------------
insert into public.provider_credentials (provider_id, credential_type, number, status)
select id, 'hefra_facility_licence', hefra_registration_number, 'pending'
from public.providers
where hefra_registration_number is not null and trim(hefra_registration_number) <> ''
on conflict (credential_type, number) do nothing;

insert into public.provider_credentials (provider_id, credential_type, number, document_path, status)
select
  p.id,
  case p.kind
    when 'care_facility' then 'hefra_facility_licence'
    when 'vendor' then 'business_reg'
    when 'practitioner' then 'business_reg'
    when 'trainer' then 'trainer_cert'
    when 'ambulance_operator' then 'hefra_facility_licence'
  end,
  'MIGRATED-' || p.id || '-' || doc.ord,
  doc.value,
  'pending'
from public.providers p
cross join lateral jsonb_array_elements_text(coalesce(p.verification_documents, '[]'::jsonb)) with ordinality as doc(value, ord)
where jsonb_typeof(coalesce(p.verification_documents, '[]'::jsonb)) = 'array'
  and jsonb_array_length(coalesce(p.verification_documents, '[]'::jsonb)) > 0
on conflict (credential_type, number) do nothing;

alter table public.providers
  drop column hefra_registration_number,
  drop column verification_documents;

-- -----------------------------------------------------------------------------
-- verification_status recompute
-- -----------------------------------------------------------------------------
create or replace function public.recompute_provider_verification_status(p_provider_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_provider_type text;
  v_current_status text;
  v_required_count int;
  v_verified_count int;
  v_new_status text;
begin
  select provider_type, verification_status into v_provider_type, v_current_status
  from public.providers where id = p_provider_id;

  select count(*) into v_required_count
  from public.provider_type_requirements ptr
  where ptr.provider_type = v_provider_type and ptr.required_for_activation;

  select count(*) into v_verified_count
  from public.provider_type_requirements ptr
  join public.provider_credentials pc
    on pc.provider_id = p_provider_id
   and pc.credential_type = ptr.credential_type
   and pc.status = 'verified'
  where ptr.provider_type = v_provider_type and ptr.required_for_activation;

  if v_required_count > 0 and v_verified_count >= v_required_count then
    v_new_status := 'verified';
  elsif v_current_status = 'verified' and v_verified_count < v_required_count then
    v_new_status := 'expired';
  elsif v_verified_count > 0 then
    v_new_status := 'pending';
  else
    v_new_status := 'unverified';
  end if;

  update public.providers
  set verification_status = v_new_status
  where id = p_provider_id and verification_status is distinct from v_new_status;
end;
$$;

revoke all on function public.recompute_provider_verification_status(uuid) from public, anon, authenticated;
grant execute on function public.recompute_provider_verification_status(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- Trigger: credential verified -> grant capabilities; expired/revoked ->
-- remove them. Either way, recompute verification_status.
-- -----------------------------------------------------------------------------
create or replace function public.fn_provider_credential_status_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_kind public.provider_kind;
begin
  if new.status is distinct from old.status then
    if new.status = 'verified' then
      select kind into v_kind from public.providers where id = new.provider_id;

      insert into public.provider_capabilities (provider_id, capability, source, credential_id, granted_by, expires_at)
      select
        new.provider_id,
        c.key,
        'credential',
        new.id,
        new.reviewed_by,
        case when new.expires_at is not null then new.expires_at::timestamptz else null end
      from public.credential_types ct
      cross join lateral unnest(ct.grants) as granted_capability
      join public.capabilities c on c.key = granted_capability and v_kind = any(c.applies_to)
      where ct.key = new.credential_type
      on conflict (provider_id, capability) do update
        set credential_id = excluded.credential_id,
            source = 'credential',
            expires_at = excluded.expires_at,
            granted_by = excluded.granted_by,
            granted_at = now(),
            override_reason = null;

    elsif new.status in ('expired', 'revoked') then
      delete from public.provider_capabilities where credential_id = new.id;
    end if;

    perform public.recompute_provider_verification_status(new.provider_id);
  end if;
  return new;
end;
$$;

create trigger trg_provider_credential_status_change
  after update of status on public.provider_credentials
  for each row execute function public.fn_provider_credential_status_change();

-- -----------------------------------------------------------------------------
-- submit_credential (owner) and admin override grant/revoke
-- -----------------------------------------------------------------------------
create or replace function public.submit_credential(
  p_provider_id uuid, p_type text, p_number text, p_document_path text,
  p_issued date default null, p_expires date default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.providers where id = p_provider_id and owner_id = (select auth.uid())) then
    raise exception 'Not your provider';
  end if;
  if not exists (select 1 from public.credential_types where key = p_type) then
    raise exception 'Unknown credential type: %', p_type;
  end if;

  insert into public.provider_credentials (provider_id, credential_type, number, document_path, issued_at, expires_at, status)
  values (p_provider_id, p_type, p_number, p_document_path, p_issued, p_expires, 'pending')
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_credential(uuid, text, text, text, date, date) from public, anon;
grant execute on function public.submit_credential(uuid, text, text, text, date, date) to authenticated, service_role;

create or replace function public.grant_provider_capability_override(p_provider_id uuid, p_capability text, p_reason text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;
  if p_reason is null or trim(p_reason) = '' then
    raise exception 'override_reason is required';
  end if;

  insert into public.provider_capabilities (provider_id, capability, source, granted_by, override_reason)
  values (p_provider_id, p_capability, 'admin_override', (select auth.uid()), p_reason)
  on conflict (provider_id, capability) do update
    set source = 'admin_override',
        credential_id = null,
        granted_by = excluded.granted_by,
        granted_at = now(),
        override_reason = excluded.override_reason,
        expires_at = null;

  insert into public.activity_logs (actor_id, action_type, target_table, record_id, new_data)
  values ((select auth.uid())::text, 'grant_capability_override', 'provider_capabilities', p_provider_id::text,
    jsonb_build_object('capability', p_capability, 'reason', p_reason));
end;
$$;

revoke all on function public.grant_provider_capability_override(uuid, text, text) from public, anon;
grant execute on function public.grant_provider_capability_override(uuid, text, text) to authenticated, service_role;

create or replace function public.revoke_provider_capability(p_provider_id uuid, p_capability text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  delete from public.provider_capabilities where provider_id = p_provider_id and capability = p_capability;

  insert into public.activity_logs (actor_id, action_type, target_table, record_id, new_data)
  values ((select auth.uid())::text, 'revoke_capability', 'provider_capabilities', p_provider_id::text,
    jsonb_build_object('capability', p_capability));

  perform public.recompute_provider_verification_status(p_provider_id);
end;
$$;

revoke all on function public.revoke_provider_capability(uuid, text) from public, anon;
grant execute on function public.revoke_provider_capability(uuid, text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- get_my_provider_context() — deferred from P0-10 because it needs
-- provider_capabilities, which now exists.
-- -----------------------------------------------------------------------------
create or replace function public.get_my_provider_context()
returns table (
  provider_id uuid,
  kind public.provider_kind,
  provider_type text,
  name text,
  capabilities text[],
  status public.facility_status_enum,
  verification_status text,
  tier text,
  has_beds boolean
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    p.id,
    p.kind,
    p.provider_type,
    p.name,
    coalesce(array_agg(pc.capability) filter (where pc.capability is not null), '{}'),
    p.status,
    p.verification_status,
    p.subscription_tier,
    exists (select 1 from public.bed_tracker_facilities btf where btf.facility_id = p.id)
  from public.providers p
  left join public.provider_capabilities pc on pc.provider_id = p.id
  where p.owner_id = (select auth.uid())
  group by p.id;
$$;

revoke all on function public.get_my_provider_context() from public, anon;
grant execute on function public.get_my_provider_context() to authenticated, service_role;
