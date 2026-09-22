-- P0-10: add 'suspended' and 'draft' to facility_status_enum, ahead of the
-- providers rename. Kept in its own migration per PLAN.md's note: ALTER TYPE
-- ... ADD VALUE cannot be used in the same transaction that reads/writes the
-- new value, so nothing in this file may reference 'suspended' or 'draft'.
alter type public.facility_status_enum add value if not exists 'suspended';
alter type public.facility_status_enum add value if not exists 'draft';
