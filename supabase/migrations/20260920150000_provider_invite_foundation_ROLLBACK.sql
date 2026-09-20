-- Rollback for 20260920150000_provider_invite_foundation.sql
--
-- twilio_whatsapp_handshakes: structure only. Its single live row (confirmed
-- via the Supabase connector before the DROP) is not recoverable — this
-- recreates the table empty. The original had broad INSERT/SELECT/UPDATE/
-- DELETE grants to `authenticated`, but RLS was enabled with zero policies,
-- so those grants were already inert (no policy = no access for anyone but
-- service_role, which bypasses RLS). Not restoring those grants deliberately
-- keeps the same effective (locked-down) access if this table ever needs to
-- exist again — rolling this back only makes sense alongside un-deleting
-- lib/twilio.ts's initiateWhatsAppHandshake(), which this PR also removes.

drop table if exists public.credential_deliveries;

revoke all on function public.get_user_id_by_email(text) from service_role;
drop function if exists public.get_user_id_by_email(text);

delete from public.admin_role_permissions
 where permission_key = 'providers.create'
   and role in ('admin', 'registrar');
delete from public.admin_permissions where key = 'providers.create';

create table if not exists public.twilio_whatsapp_handshakes (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  facility_email text not null,
  gps_address text not null,
  status text,
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now()
);
alter table public.twilio_whatsapp_handshakes enable row level security;
