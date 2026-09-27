drop trigger if exists facility_reviews_recompute_provider_rating on public.facility_reviews;
drop function if exists public.recompute_provider_rating_aggregate();
notify pgrst, 'reload schema';
