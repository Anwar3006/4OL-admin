-- Permanent reward-catalog fixtures spanning every reward_type/fulfillment_method
-- combination so every disbursement branch (manual cash/airtime send, automatic
-- FitCoins/subscription grant, code-based voucher, physical shipping) has a
-- real row to test and assign to trivia (or later, any other domain) tiers.
-- Idempotent on source_key so this migration can be re-applied safely.

insert into public.reward_catalog
  (name, description, icon, reward_type, amount, currency, domains, fulfillment_method, inventory_count, source_key)
values
  ('Cash Prize — GHS 500', 'Top-place cash prize, sent by mobile money after winner verification.', '💵', 'cash', 500, 'GHS', array['general','trivia']::text[], 'manual', null, 'seed:cash_500'),
  ('Cash Prize — GHS 200', 'Runner-up cash prize, sent by mobile money after winner verification.', '💵', 'cash', 200, 'GHS', array['general','trivia']::text[], 'manual', null, 'seed:cash_200'),
  ('Cash Prize — GHS 100', 'Cash prize, sent by mobile money after winner verification.', '💵', 'cash', 100, 'GHS', array['general','trivia']::text[], 'manual', null, 'seed:cash_100'),
  ('Cash Prize — GHS 50', 'Cash prize, sent by mobile money after winner verification.', '💵', 'cash', 50, 'GHS', array['general','trivia']::text[], 'manual', null, 'seed:cash_50'),
  ('Airtime — GHS 20', 'Mobile airtime top-up.', '📱', 'airtime', 20, 'GHS', array['general','trivia']::text[], 'manual', null, 'seed:airtime_20'),
  ('Airtime — GHS 10', 'Mobile airtime top-up.', '📱', 'airtime', 10, 'GHS', array['general','trivia']::text[], 'manual', null, 'seed:airtime_10'),
  ('Data Bundle — 1GB', 'Mobile data bundle top-up.', '📶', 'data', null, null, array['general','trivia']::text[], 'manual', null, 'seed:data_1gb'),
  ('Data Bundle — 500MB', 'Mobile data bundle top-up.', '📶', 'data', null, null, array['general','trivia']::text[], 'manual', null, 'seed:data_500mb'),
  ('1000 FitCoins', 'In-app FitCoins balance top-up, granted automatically.', '🪙', 'fitcoins', null, null, array['general','trivia','fitcoins']::text[], 'automatic', null, 'seed:fitcoins_1000'),
  ('500 FitCoins', 'In-app FitCoins balance top-up, granted automatically.', '🪙', 'fitcoins', null, null, array['general','trivia','fitcoins']::text[], 'automatic', null, 'seed:fitcoins_500'),
  ('100 FitCoins', 'In-app FitCoins balance top-up, granted automatically.', '🪙', 'fitcoins', null, null, array['general','trivia','fitcoins']::text[], 'automatic', null, 'seed:fitcoins_100'),
  ('Cycle Pro — 30 Days', '30-day Cycle Pro premium grant, applied automatically.', '⭐', 'subscription', null, null, array['general','trivia']::text[], 'automatic', null, 'seed:cycle_pro_30d'),
  ('Cycle Pro — 7 Days', '7-day Cycle Pro premium grant, applied automatically.', '⭐', 'subscription', null, null, array['general','trivia']::text[], 'automatic', null, 'seed:cycle_pro_7d'),
  ('Cycle Pro Discount Voucher', '20% off a Cycle Pro subscription, redeemed with a one-time code.', '🎟️', 'discount', null, null, array['general','trivia']::text[], 'code', 100, 'seed:discount_cycle_pro_20'),
  ('Branded Merchandise Pack', 'Physical prize pack, shipped by the fulfillment team.', '📦', 'physical', null, null, array['general','trivia']::text[], 'physical', 10, 'seed:physical_merch_pack')
on conflict (source_key) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  reward_type = excluded.reward_type,
  amount = excluded.amount,
  currency = excluded.currency,
  domains = excluded.domains,
  fulfillment_method = excluded.fulfillment_method,
  inventory_count = excluded.inventory_count,
  updated_at = now();

update public.reward_catalog set value = '1GB' where source_key = 'seed:data_1gb' and value is distinct from '1GB';
update public.reward_catalog set value = '500MB' where source_key = 'seed:data_500mb' and value is distinct from '500MB';
update public.reward_catalog set value = '1000 FitCoins' where source_key = 'seed:fitcoins_1000' and value is distinct from '1000 FitCoins';
update public.reward_catalog set value = '500 FitCoins' where source_key = 'seed:fitcoins_500' and value is distinct from '500 FitCoins';
update public.reward_catalog set value = '100 FitCoins' where source_key = 'seed:fitcoins_100' and value is distinct from '100 FitCoins';
update public.reward_catalog set value = '30 days Cycle Pro', metadata = metadata || '{"duration_days": 30}'::jsonb where source_key = 'seed:cycle_pro_30d';
update public.reward_catalog set value = '7 days Cycle Pro', metadata = metadata || '{"duration_days": 7}'::jsonb where source_key = 'seed:cycle_pro_7d';
update public.reward_catalog set value = '20% off' where source_key = 'seed:discount_cycle_pro_20' and value is distinct from '20% off';
