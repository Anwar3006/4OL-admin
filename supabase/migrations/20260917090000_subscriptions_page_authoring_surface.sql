-- Subscription-plan management was consolidated out of Marketing (and out of
-- Settings' narrower Plans tab, and Fitness's own read-only mirror) into the
-- /subscriptions admin page (features/subscriptions). The plan catalog
-- (subscription_tiers), the subscriber lifecycle table and Pass Requests are
-- all authored there now, via /api/subscriptions/plans and
-- /api/subscriptions/subscribers. Nothing about the schema changes here —
-- RLS, indexes and every other column are untouched by this UI/route-layer
-- migration — only the column comment, which had gone stale and pointed
-- admins at a page that no longer authors this table.
comment on column public.subscription_tiers.product_scope is
  'Commercial product owning this plan: full_access, plasence, or fitness. The /subscriptions admin page (features/subscriptions) is the authoring surface.';
