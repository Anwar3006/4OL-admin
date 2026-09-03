-- =============================================================================
-- Email suppression list for SES bounce/complaint handling
--
-- Backs the SNS webhook at app/api/webhooks/ses-events, which AWS SES posts
-- Bounce/Complaint/Delivery events to via a configuration set event
-- destination. Hard bounces and complaints get recorded here so sends can
-- check and skip a known-bad address, on top of SES's own account-level
-- suppression list.
-- =============================================================================

create table if not exists public.email_suppressions (
  email text primary key,
  reason text not null check (reason in ('hard_bounce', 'complaint')),
  suppressed_at timestamptz not null default now(),
  source_event jsonb
);

alter table public.email_suppressions enable row level security;

drop policy if exists "email_suppressions_admin_all" on public.email_suppressions;
create policy "email_suppressions_admin_all"
  on public.email_suppressions
  for all
  to authenticated
  using (public.is_platform_admin((select auth.uid())))
  with check (public.is_platform_admin((select auth.uid())));
