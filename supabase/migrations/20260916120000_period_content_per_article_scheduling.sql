-- Per-article scheduling for Period Library content.
--
-- Before this, "scheduling a suggestion" wrote scheduled_at /
-- frequency_cap_days / surface_duration_weeks / surface_channel onto
-- period_ai_jobs and stopped. Nothing read those columns: the mobile feed
-- (features/period/api/library.ts) is driven entirely by
-- period_content_publications, so the schedule date passed and nothing
-- happened. Scheduling was a sticky note.
--
-- Two decisions encoded here:
--
-- 1. PER ARTICLE, not per run. The schedule lives on the publication row,
--    which is already one-per-(content, channel), so eight drafts from one
--    generation run can each have their own date.
--
-- 2. THE END DATE UN-FEATURES, IT DOES NOT KILL. featured_until is when an
--    article drops out of the featured carousel and the Today row; it stays
--    published, searchable, and readable for anyone who bookmarked it.
--    ends_at remains the hard stop and should stay NULL for normal content
--    -- it exists for takedowns, not for rotation.

alter table public.period_content_publications
  add column if not exists featured_until timestamptz,
  add column if not exists surfaces text[] not null default array['library_featured']::text[],
  add column if not exists frequency_cap_days integer,
  add column if not exists ai_job_id uuid references public.period_ai_jobs(id) on delete set null,
  add column if not exists scheduled_by uuid references auth.users(id) on delete set null;

comment on column public.period_content_publications.featured_until is
  'When the article stops being promoted (featured carousel / Today row) but stays published and readable. NULL = featured for as long as featured is true. This is rotation, not removal -- ends_at is removal.';

comment on column public.period_content_publications.surfaces is
  'Where this article is promoted while inside its featured window: library_featured (Library featured carousel), today_for_you (the For You row on the Today screen). An article with an empty array is still readable in the Library, just never promoted.';

comment on column public.period_content_publications.frequency_cap_days is
  'Minimum days before the same user may be re-promoted this article. NULL = no cap.';

alter table public.period_content_publications
  drop constraint if exists period_content_publications_surfaces_check;

alter table public.period_content_publications
  add constraint period_content_publications_surfaces_check
  check (surfaces <@ array['library_featured', 'today_for_you']::text[]);

-- featured_until must sit inside the publication window when both are set.
alter table public.period_content_publications
  drop constraint if exists period_content_publications_featured_window_check;

alter table public.period_content_publications
  add constraint period_content_publications_featured_window_check
  check (featured_until is null or featured_until > starts_at);

create index if not exists period_content_publications_featured_until_idx
  on public.period_content_publications (channel, featured_until)
  where featured is true;

create index if not exists period_content_publications_ai_job_idx
  on public.period_content_publications (ai_job_id)
  where ai_job_id is not null;
