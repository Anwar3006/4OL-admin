-- Rollback for P2-02 practitioner workspace.
-- The replacement request_provider_booking body remains in place: it is a
-- backwards-compatible safety fix that enforces the mode a consumer chose.

revoke execute on function public.get_provider_booking_slots(uuid, uuid, date, text) from authenticated, service_role;
revoke execute on function public.get_my_practitioner_workspace(uuid) from authenticated, service_role;
revoke execute on function public.upsert_my_practitioner_details(uuid, jsonb) from authenticated, service_role;
revoke execute on function public.get_my_practitioner_schedule(uuid, date, date) from authenticated, service_role;
revoke execute on function public.get_my_practitioner_patients(uuid) from authenticated, service_role;
revoke execute on function public.upsert_provider_booking_block(uuid, uuid, jsonb) from authenticated, service_role;
revoke execute on function public.delete_provider_booking_block(uuid, uuid) from authenticated, service_role;

drop function if exists public.delete_provider_booking_block(uuid, uuid);
drop function if exists public.upsert_provider_booking_block(uuid, uuid, jsonb);
drop function if exists public.get_my_practitioner_patients(uuid);
drop function if exists public.get_my_practitioner_schedule(uuid, date, date);
drop function if exists public.upsert_my_practitioner_details(uuid, jsonb);
drop function if exists public.get_my_practitioner_workspace(uuid);
drop function if exists public.get_provider_booking_slots(uuid, uuid, date, text);

notify pgrst, 'reload schema';
