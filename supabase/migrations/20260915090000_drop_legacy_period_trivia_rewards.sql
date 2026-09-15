-- period_trivia_rewards was a duplicate of reward_catalog, kept alive only by
-- the bidirectional sync triggers added in 20260914230918_central_rewards_catalog.sql
-- to protect already-deployed code during rollout. No application code reads
-- or writes this table any more (confirmed: reward_catalog is the only table
-- create_trivia_reward / the rewards admin UI ever touch) — safe to remove.

drop trigger if exists sync_reward_catalog_to_legacy_trivia_trigger on public.reward_catalog;
drop trigger if exists sync_legacy_trivia_to_reward_catalog_trigger on public.period_trivia_rewards;
drop function if exists public.sync_reward_catalog_to_legacy_trivia();
drop function if exists public.sync_legacy_trivia_to_reward_catalog();

-- Each reward_id column carries two FKs today: one at the old table (from
-- 20260818_period_trivia_rewards.sql / 20260830_period_premium_fulfillment_trivia_ops.sql)
-- and one at reward_catalog (added alongside the sync triggers). Drop only
-- the legacy one; the reward_catalog FK is the one the app has used since
-- yesterday and stays.
alter table public.period_trivia_events
  drop constraint if exists period_trivia_events_reward_id_fkey;
alter table public.period_trivia_fulfillment
  drop constraint if exists period_trivia_fulfillment_reward_id_fkey;

drop table if exists public.period_trivia_rewards;
