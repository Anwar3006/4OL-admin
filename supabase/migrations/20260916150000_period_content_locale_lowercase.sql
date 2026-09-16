-- Store the locale tag lowercased, because the server normalises the
-- incoming one that way and then compares exactly:
--
--   const locale = (searchParams.get("locale") ?? "…").trim().toLowerCase();
--   .eq("locale", locale)
--
-- So a row stored as 'en-GH' could never be matched by a request for
-- 'en-GH' -- the parameter became 'en-gh' before the comparison, and
-- PostgREST eq is case-sensitive. While every row was plain 'en' this was
-- invisible (lowercasing 'en' changes nothing); the moment the data moved to
-- 'en-GH' the Library returned zero rows.
--
-- Two sides to the fix: features/period/api/library.ts now lowercases both
-- sides before comparing and falls back to the language subtag, and the
-- stored value matches the normalisation the server already applies. BCP-47
-- is case-insensitive by specification, so 'en-gh' is a valid spelling of
-- the same tag; any display capitalisation belongs in the UI.

update public.period_content
   set locale = lower(locale)
 where locale <> lower(locale);

alter table public.period_content
  alter column locale set default 'en-gh';

comment on column public.period_content.locale is
  'BCP-47 tag, stored lowercased to match the normalisation the mobile feed applies to its locale parameter. en-gh is the platform default (Ghanaian English); the feed also matches on the language subtag, so a request for en resolves en-gh.';
