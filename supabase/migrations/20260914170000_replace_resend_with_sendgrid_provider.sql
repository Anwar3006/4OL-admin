-- Transactional email moved from Resend to Twilio SendGrid. Preserve any
-- operator metadata while keeping the provider constraints aligned with the
-- application API.

update public.platform_api_keys
set provider = 'sendgrid',
    name = case when name ilike '%resend%' then 'Twilio SendGrid' else name end,
    updated_at = now()
where provider = 'resend';

update public.platform_integrations
set provider = 'sendgrid',
    name = case when name ilike '%resend%' then 'Twilio SendGrid' else name end,
    updated_at = now()
where provider = 'resend';

alter table public.platform_api_keys
  drop constraint if exists platform_api_keys_provider_check;
alter table public.platform_api_keys
  add constraint platform_api_keys_provider_check
  check (provider in ('google', 'twilio', 'sendgrid', 'paystack', 'momo', 'gemini', 'firebase', 'openai'));

alter table public.platform_integrations
  drop constraint if exists platform_integrations_provider_check;
alter table public.platform_integrations
  add constraint platform_integrations_provider_check
  check (provider in ('google', 'twilio', 'sendgrid', 'paystack', 'momo', 'gemini', 'firebase', 'openai', 'supabase', 'github'));
