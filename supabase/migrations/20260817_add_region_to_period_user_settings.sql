-- Period tracker never actually captured region anywhere -- the admin
-- route's loadProfiles() selected user_profiles.region, but that column
-- doesn't exist on user_profiles (or anywhere else tied to a user on this
-- platform); region only exists on entity tables (facility_profile,
-- job_postings, etc). Because that select referenced a nonexistent column,
-- the whole query errored, was silently discarded (error not checked), and
-- loadProfiles returned [] for every call -- which is why names were also
-- always masked down to "Anonymous user", not just region.
alter table public.period_user_settings add column if not exists region text;
