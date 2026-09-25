-- Rollback for 20260925110000_emergency_bed_request_fanout.sql.
-- Run only after ensuring there are no active emergency requests.

select cron.unschedule(jobid)
from cron.job
where jobname = 'emergency-bed-request-timeouts';

drop trigger if exists trg_emergency_bed_request_facilities_updated_at on public.emergency_bed_request_facilities;
drop trigger if exists trg_emergency_bed_requests_updated_at on public.emergency_bed_requests;

drop function if exists public.process_expired_emergency_bed_requests();
drop function if exists public.get_my_pending_emergency_bed_alerts();
drop function if exists public.get_my_emergency_bed_requests();
drop function if exists public.select_emergency_bed_destination(uuid);
drop function if exists public.respond_to_emergency_bed_request(uuid, text, text);
drop function if exists public.create_emergency_bed_request(double precision, double precision, text, text, text, text);
drop function if exists public.fn_advance_emergency_bed_request(uuid);
drop function if exists public.fn_emergency_bed_fanout(uuid);

drop table if exists public.emergency_bed_request_facilities;
drop table if exists public.emergency_bed_requests;

alter table public.providers
  drop column if exists emergency_alert_sound_enabled,
  drop column if exists emergency_bed_alerts_enabled;

delete from public.provider_role_permissions
where permission_key in ('emergency.dispatch', 'emergency.respond');
delete from public.provider_permissions
where key in ('emergency.dispatch', 'emergency.respond');

notify pgrst, 'reload schema';
