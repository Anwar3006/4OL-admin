-- ============================================================================
-- Period Tracker gap closure: Cycle Pro paywall tiers + enforcement indexes
-- Branch: feat/period-gap-closure (4OurLife-Admin)
--
-- G12: Cycle Pro tiers become selectable subscription offers so the mobile
--      lock/reminder banners have a real upgrade path. Launch pricing below is
--      a placeholder — adjust via the admin Subscription tiers surface before
--      enabling Paystack collection.
-- G6:  unique index backing the idempotent per-day insight generation in
--      /api/period/me.
-- G7:  lookup index for the campaign dispatch frequency-cap query.
-- ============================================================================

-- 1) Widen the subscription tier key check so Period tiers can exist.
do $$
begin
  alter table public.subscription_tiers drop constraint if exists subscription_tiers_key_check;
exception when others then null;
end $$;

alter table public.subscription_tiers
  add constraint subscription_tiers_key_check
  check (key in ('free', 'premium', 'lifetime', 'cycle_pro', 'cycle_pro_ttc', 'cycle_pro_insights'));

insert into public.subscription_tiers (key, name, description, price_ghs, duration_days, benefits, display_order) values
  ('cycle_pro', 'Cycle Pro',
   'Extended forecasts, full history and export, TTC and fertility tools, and fertility insights for the Plasence tracker.',
   19.90, 30,
   '["Extended 6-cycle forecasts", "Full history & export", "TTC & fertility tools", "Fertility insights"]'::jsonb,
   10),
  ('cycle_pro_ttc', 'Cycle Pro TTC',
   'Everything in Cycle Pro plus guided preconception checklists, ovulation-test tracking and appointment planning.',
   29.90, 30,
   '["Everything in Cycle Pro", "Preconception checklist guidance", "Ovulation test tracking", "Appointment planner"]'::jsonb,
   11),
  ('cycle_pro_insights', 'Cycle Pro Insights',
   'Everything in Cycle Pro with deeper pattern insights and temperature-shift analysis.',
   14.90, 30,
   '["Everything in Cycle Pro", "Deeper pattern insights", "Temperature shift analysis"]'::jsonb,
   12)
on conflict (key) do nothing;

-- 2) Idempotent insight generation: one card per user, type and day.
create unique index if not exists uq_period_fertility_insights_user_type_date
  on public.period_fertility_insights (user_id, insight_type, insight_date);

-- 3) Frequency-cap lookups during campaign dispatch.
create index if not exists idx_notifications_type_created
  on public.notifications (type, created_at);
