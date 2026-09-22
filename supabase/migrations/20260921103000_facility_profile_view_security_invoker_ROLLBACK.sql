-- Rollback for 20260921103000_facility_profile_view_security_invoker.sql
alter view public.facility_profile set (security_invoker = false, security_barrier = true);
