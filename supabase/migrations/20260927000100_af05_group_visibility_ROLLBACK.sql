-- ROLLBACK for 20260927000100_af05_group_visibility.sql
-- Removes the AF-05 Part 3 visibility switch. Safe: dropping the column drops
-- its default + comment; the check constraint is dropped explicitly first.

drop index if exists public.idx_conversations_visibility_group;

alter table public.conversations
  drop constraint if exists conversations_visibility_check;

alter table public.conversations
  drop column if exists visibility;
