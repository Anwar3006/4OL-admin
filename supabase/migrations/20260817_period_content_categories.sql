-- Period Library content categories.
--
-- period_content.topic has always been a free-text column, filled in by
-- hand on both the manual "Create content draft" form
-- (app/(dashboard)/period/page.tsx) and the AI generation form
-- (app/(dashboard)/ai-hub/period/_components/Workspace.tsx). The mobile
-- app's Today screen now has three tiles (Nutrition, Move Your Body, Stay
-- Hydrated) that deep-link into the Library filtered/searched by these
-- exact labels, so editors need a selectable, DB-backed list to assign
-- content to them consistently instead of retyping free text that may or
-- may not match.
--
-- This intentionally does NOT add a foreign key / enum constraint on
-- period_content.topic — that column already holds years of arbitrary
-- editorial topic strings, and the mobile Library screen's topic filter
-- already derives its chip list dynamically from whatever's published
-- (features/plasence/screens/LibraryScreen.tsx). This table is purely the
-- source-of-truth option list the admin UI's "Topic" selects read from; the
-- admin forms still write the chosen label into the existing free-text
-- column.
create table if not exists public.period_content_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.period_content_categories (slug, label, sort_order) values
  ('nutrition', 'Nutrition', 1),
  ('movement', 'Move Your Body', 2),
  ('hydration', 'Stay Hydrated', 3)
on conflict (slug) do nothing;

alter table public.period_content_categories enable row level security;

drop policy if exists admin_access on public.period_content_categories;
create policy admin_access on public.period_content_categories
  for all to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());
