-- =============================================================================
-- P0-06: provider account creation and credential delivery foundation.
--
-- Three independent pieces, bundled because they all land with the same PR:
--
-- 1. credential_deliveries: tracks each email/WhatsApp/SMS attempt made while
--    inviting a new provider owner, so the admin UI can show per-channel
--    status instead of a plaintext password, and "Resend invite" has
--    something to read. Never stores the invite link or token — only a
--    masked destination and the provider's own message id.
--
-- 2. get_user_id_by_email: server code needs to check "does this email
--    already have an account, and what's its id?" before deciding whether to
--    create a new auth user or attach a branch to an existing owner.
--    user_profiles has no email column (email lives only in auth.users, which
--    PostgREST does not expose), and the previous approach
--    (admin.auth.admin.listUsers({perPage:1000})) is O(all users) per check
--    and silently wrong past 1000 accounts. Mirrors
--    auth_user_exists_by_email (20260820000000_auth_user_exists_by_email.sql)
--    exactly: SECURITY DEFINER, service_role only.
--
-- 3. providers.create permission: registerProviderAccount() is callable by
--    admins AND registrars (registrars register facilities in the field
--    today via register_facility_with_profile but have no permission key of
--    their own gating the new no-password flow). Added to the RBAC catalog
--    from supabase/migrations/20260817_rbac_permission_catalog.sql.
--
-- Also drops twilio_whatsapp_handshakes: the table backing the legacy
-- initiateWhatsAppHandshake() handshake this PR replaces. It stores
-- gps_address — the same dev-tunnel-adjacent leak surface documented for
-- on_facility_created in P0-03 — and is being removed, not just orphaned.
-- Confirmed via the Supabase connector: 1 row on prod. Its only writer
-- (lib/twilio.ts's initiateWhatsAppHandshake) and that function's only caller
-- (actions/share-facility-login.ts's notifyFacilityRegistration) are both
-- deleted in this same PR, so this is delete-on-evidence, not delete-on-
-- reading: grep confirms no other caller, and the live row count confirms
-- there is no meaningful history to lose.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. credential_deliveries
-- -----------------------------------------------------------------------------
create table public.credential_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_id uuid,                                   -- FK to providers(id) after P0-10
  channel text not null check (channel in ('email','whatsapp','sms')),
  destination_masked text not null,
  status text not null check (status in ('sent','delivered','failed','undelivered','skipped')),
  provider_message_id text, error text, attempt int not null default 1,
  created_by uuid references auth.users(id), created_at timestamptz not null default now()
);

create index credential_deliveries_user_id_idx on public.credential_deliveries(user_id);
create index credential_deliveries_provider_message_id_idx on public.credential_deliveries(provider_message_id)
  where provider_message_id is not null;

alter table public.credential_deliveries enable row level security;
create policy "admins read deliveries" on public.credential_deliveries
  for select to authenticated using ((select public.is_admin()));

revoke all on public.credential_deliveries from anon;
revoke all on public.credential_deliveries from authenticated;
grant select on public.credential_deliveries to authenticated; -- RLS policy above narrows this to admins
grant all on public.credential_deliveries to service_role;

-- -----------------------------------------------------------------------------
-- 2. get_user_id_by_email
-- -----------------------------------------------------------------------------
create or replace function public.get_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from auth.users
   where lower(email) = lower(trim(p_email))
     and deleted_at is null
   limit 1;
$$;

revoke all on function public.get_user_id_by_email(text) from public;
revoke all on function public.get_user_id_by_email(text) from anon;
revoke all on function public.get_user_id_by_email(text) from authenticated;
grant execute on function public.get_user_id_by_email(text) to service_role;

-- -----------------------------------------------------------------------------
-- 3. providers.create permission
-- -----------------------------------------------------------------------------
insert into public.admin_permissions (key, resource, action, description)
values ('providers.create', 'providers', 'create', 'Register provider (facility owner) accounts and deliver credentials')
on conflict (key) do update
  set resource = excluded.resource,
      action = excluded.action,
      description = excluded.description;

insert into public.admin_role_permissions (role, permission_key)
values ('admin', 'providers.create'), ('registrar', 'providers.create')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 4. drop the legacy WhatsApp handshake table (see header)
-- -----------------------------------------------------------------------------
drop table if exists public.twilio_whatsapp_handshakes;
