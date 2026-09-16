-- Standardise Period Library content on the regional tag.
--
-- The admin content dialog defaults to en-GH (matching admin-panel.html)
-- while every earlier row was plain "en", and the mobile feed matched the
-- locale exactly -- so the first en-GH article was published, live and
-- inside its window, yet absent from the Library. It still showed on the
-- Today screen, whose query had no locale filter at all, so tapping it
-- opened a Library that did not contain it.
--
-- One tag everywhere removes the split. features/period/api/library.ts also
-- matches on the language subtag now, so en and en-GH interoperate whatever
-- a future row says -- this migration makes the data uniform, the subtag
-- rule keeps it from mattering again.

update public.period_content
   set locale = 'en-GH'
 where lower(locale) = 'en';

alter table public.period_content
  alter column locale set default 'en-GH';

comment on column public.period_content.locale is
  'BCP-47 tag for the article. en-GH is the platform default (Ghanaian English). The mobile feed matches on the language subtag, so en and en-GH resolve to each other.';
