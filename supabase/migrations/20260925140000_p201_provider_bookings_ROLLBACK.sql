-- Rollback for 20260925140000_p201_provider_bookings.sql.
-- This removes booking data and should only be used before the feature has
-- accepted live bookings or after exporting it.

drop function if exists public.cancel_my_provider_booking(uuid, text);
drop function if exists public.get_my_provider_bookings(uuid);
drop function if exists public.get_my_bookings();
drop function if exists public.decide_provider_booking(uuid, text, text, timestamptz);
drop function if exists public.request_provider_booking(uuid, uuid, timestamptz, text, text);
drop function if exists public.get_provider_booking_slots(uuid, uuid, date);
drop function if exists public.get_public_provider_trust(uuid);
drop function if exists public.get_public_provider_booking_profile(uuid);
drop function if exists public.upsert_provider_booking_availability(uuid, uuid, jsonb);
drop function if exists public.set_catalogue_booking_settings(uuid, uuid, jsonb);

drop table if exists public.provider_booking_group_attendees;
drop table if exists public.provider_bookings;
drop table if exists public.provider_booking_blocks;
drop table if exists public.provider_booking_availability;

drop index if exists public.provider_catalogue_items_bookable_idx;
alter table public.provider_catalogue_items
  drop constraint if exists provider_catalogue_items_bookable_item_type,
  drop constraint if exists provider_catalogue_items_booking_capacity_positive,
  drop constraint if exists provider_catalogue_items_booking_modes_valid,
  drop column if exists booking_notes,
  drop column if exists booking_department_id,
  drop column if exists booking_capacity,
  drop column if exists booking_modes,
  drop column if exists is_bookable;

notify pgrst, 'reload schema';
