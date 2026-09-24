-- Sheet 16: provider-scoped, privacy-preserving review feed.
-- It returns no customer identity and only approved top-level reviews plus
-- official business replies, rather than exposing facility_reviews directly.
create or replace function public.get_provider_reviews(p_provider_id uuid)
returns table(
  id uuid, rating integer, comment_text text, created_at timestamptz,
  replies jsonb
)
language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public.is_provider_member(p_provider_id, 'profile.edit') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return query
  select r.id, r.rating, r.comment_text, r.created_at,
    coalesce((select jsonb_agg(jsonb_build_object(
      'id', reply.id, 'comment_text', reply.comment_text,
      'created_at', reply.created_at) order by reply.created_at)
      from public.facility_reviews reply
      where reply.parent_id = r.id and reply.is_provider_reply and reply.status = 'approved'), '[]'::jsonb)
  from public.facility_reviews r
  where r.facility_id = p_provider_id and r.parent_id is null and r.status = 'approved'
  order by r.created_at desc;
end;
$function$;
revoke all on function public.get_provider_reviews(uuid) from public, anon;
grant execute on function public.get_provider_reviews(uuid) to authenticated, service_role;
