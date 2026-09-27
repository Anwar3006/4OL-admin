create or replace function public.recompute_provider_rating_aggregate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provider_id uuid;
begin
  for v_provider_id in
    select distinct id
    from unnest(array[
      case when tg_op = 'DELETE' then old.facility_id else new.facility_id end,
      case when tg_op = 'UPDATE' then old.facility_id else null end
    ]) id
    where id is not null
  loop
    update public.providers p
    set rating_average = coalesce((
          select round(avg(r.rating)::numeric, 1)
          from public.facility_reviews r
          where r.facility_id = v_provider_id
            and r.parent_id is null
            and r.status = 'approved'
            and r.rating is not null
        ), 0),
        rating_count = (
          select count(*)::integer
          from public.facility_reviews r
          where r.facility_id = v_provider_id
            and r.parent_id is null
            and r.status = 'approved'
            and r.rating is not null
        )
    where p.id = v_provider_id;
  end loop;
  return coalesce(new, old);
end;
$$;

revoke all on function public.recompute_provider_rating_aggregate() from public, anon, authenticated;

drop trigger if exists facility_reviews_recompute_provider_rating on public.facility_reviews;
create trigger facility_reviews_recompute_provider_rating
after insert or update or delete on public.facility_reviews
for each row execute function public.recompute_provider_rating_aggregate();

update public.providers p
set rating_average = coalesce((
      select round(avg(r.rating)::numeric, 1)
      from public.facility_reviews r
      where r.facility_id = p.id
        and r.parent_id is null
        and r.status = 'approved'
        and r.rating is not null
    ), 0),
    rating_count = (
      select count(*)::integer
      from public.facility_reviews r
      where r.facility_id = p.id
        and r.parent_id is null
        and r.status = 'approved'
        and r.rating is not null
    );

notify pgrst, 'reload schema';
