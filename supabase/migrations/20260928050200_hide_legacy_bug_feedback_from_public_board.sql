-- Bug reports can contain account, device, or security details. They are not
-- public product feedback: hide any legacy rows and ensure the consumer-board
-- read/write RPCs never expose or accept that category.
update public.feedback_posts
set visibility = 'hidden', updated_at = now()
where category = 'bug'
  and visibility <> 'hidden';

create or replace function public.get_feedback_board(
  p_category text default null,
  p_status text default null,
  p_module text default null,
  p_sort text default 'top',
  p_mine boolean default false,
  p_limit int default 30,
  p_offset int default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_me uuid := auth.uid();
  v_admin boolean := false;
begin
  if v_me is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if p_category is not null and p_category not in ('review', 'suggestion', 'recommendation', 'praise') then
    raise exception 'Invalid category' using errcode = '22023';
  end if;
  if p_status is not null and p_status not in ('open', 'under_review', 'planned', 'in_progress', 'shipped', 'closed') then
    raise exception 'Invalid status' using errcode = '22023';
  end if;
  if p_sort not in ('top', 'new', 'status') then raise exception 'Invalid sort' using errcode = '22023'; end if;
  p_limit := greatest(1, least(coalesce(p_limit, 30), 100));
  p_offset := greatest(0, coalesce(p_offset, 0));
  begin select public.is_app_admin() into v_admin; exception when undefined_function then v_admin := false; end;

  return jsonb_build_object('posts', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', x.id, 'category', x.category,
      'user_id', case when x.is_anonymous and x.user_id <> v_me then null else x.user_id end,
      'title', x.title, 'body_preview', left(x.body, 280), 'rating', x.rating,
      'module', x.module, 'status', x.status, 'status_note', x.status_note,
      'vote_count', x.vote_count, 'flag_count', x.flag_count, 'created_at', x.created_at,
      'is_mine', x.user_id = v_me, 'voted', x.voted, 'reply_count', x.reply_count
    ))
    from (
      select p.*, count(distinct v.user_id) as vote_count,
        count(distinct f.user_id) as flag_count, count(distinct r.id) as reply_count,
        exists(select 1 from public.feedback_post_votes myv where myv.post_id = p.id and myv.user_id = v_me) as voted
      from public.feedback_posts p
      left join public.feedback_post_votes v on v.post_id = p.id
      left join public.feedback_post_flags f on f.post_id = p.id
      left join public.feedback_post_replies r on r.post_id = p.id
      where p.category <> 'bug'
        and (case when p_mine then p.user_id = v_me else p.visibility = 'published' or p.user_id = v_me or v_admin end)
        and (p_category is null or p.category = p_category)
        and (p_status is null or p.status = p_status)
        and (p_module is null or p.module = p_module)
      group by p.id
      order by case when p_sort = 'top' then count(distinct v.user_id) end desc,
        case when p_sort = 'status' then p.status end asc, p.created_at desc
      limit p_limit offset p_offset
    ) x
  ), '[]'::jsonb));
end;
$function$;

create or replace function public.get_feedback_post(p_post_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_me uuid := auth.uid();
  v_post public.feedback_posts%rowtype;
  v_admin boolean := false;
begin
  if v_me is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  select * into v_post from public.feedback_posts where id = p_post_id;
  if not found then raise exception 'Feedback post not found' using errcode = 'P0002'; end if;
  begin select public.is_app_admin() into v_admin; exception when undefined_function then v_admin := false; end;
  if v_post.category = 'bug' and not v_admin then raise exception 'Feedback post not found' using errcode = 'P0002'; end if;
  if v_post.visibility <> 'published' and v_post.user_id <> v_me and not v_admin then raise exception 'Not authorized' using errcode = '42501'; end if;
  return jsonb_build_object('post', jsonb_build_object(
    'id', v_post.id, 'category', v_post.category,
    'user_id', case when v_post.is_anonymous and v_post.user_id <> v_me then null else v_post.user_id end,
    'title', v_post.title, 'body', v_post.body, 'rating', v_post.rating, 'module', v_post.module,
    'status', v_post.status, 'status_note', v_post.status_note,
    'vote_count', (select count(*) from public.feedback_post_votes where post_id = v_post.id),
    'created_at', v_post.created_at, 'is_mine', v_post.user_id = v_me,
    'voted', exists(select 1 from public.feedback_post_votes where post_id = v_post.id and user_id = v_me),
    'watching', exists(select 1 from public.feedback_post_watches where post_id = v_post.id and user_id = v_me)
  ), 'replies', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'author_user_id', case when v_post.is_anonymous and not r.is_staff then null else r.author_user_id end,
      'is_staff', r.is_staff, 'body', r.body, 'created_at', r.created_at
    ) order by r.created_at)
    from public.feedback_post_replies r where r.post_id = v_post.id
  ), '[]'::jsonb));
end;
$function$;

create or replace function public.vote_feedback_post(p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare v_me uuid := auth.uid(); v_voted boolean;
begin
  if v_me is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if not exists(select 1 from public.feedback_posts where id = p_post_id and visibility = 'published' and category <> 'bug') then
    raise exception 'Feedback post not found' using errcode = 'P0002';
  end if;
  delete from public.feedback_post_votes where post_id = p_post_id and user_id = v_me returning true into v_voted;
  if v_voted then v_voted := false; else insert into public.feedback_post_votes(post_id, user_id) values(p_post_id, v_me); v_voted := true; end if;
  return jsonb_build_object('ok', true, 'voted', v_voted, 'vote_count', (select count(*) from public.feedback_post_votes where post_id = p_post_id));
end;
$function$;

create or replace function public.watch_feedback_post(p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare v_me uuid := auth.uid(); v_watching boolean;
begin
  if v_me is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if not exists(select 1 from public.feedback_posts where id = p_post_id and category <> 'bug' and (visibility = 'published' or user_id = v_me)) then
    raise exception 'Feedback post not found' using errcode = 'P0002';
  end if;
  delete from public.feedback_post_watches where post_id = p_post_id and user_id = v_me returning true into v_watching;
  if v_watching then v_watching := false; else insert into public.feedback_post_watches(post_id, user_id) values(p_post_id, v_me); v_watching := true; end if;
  return jsonb_build_object('ok', true, 'watching', v_watching);
end;
$function$;

create or replace function public.flag_feedback_post(p_post_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare v_me uuid := auth.uid(); v_count int;
begin
  if v_me is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if not exists(select 1 from public.feedback_posts where id = p_post_id and visibility = 'published' and category <> 'bug') then
    raise exception 'Feedback post not found' using errcode = 'P0002';
  end if;
  insert into public.feedback_post_flags(post_id, user_id, reason) values(p_post_id, v_me, nullif(trim(p_reason), '')) on conflict(post_id, user_id) do nothing;
  select count(*) into v_count from public.feedback_post_flags where post_id = p_post_id;
  return jsonb_build_object('ok', true, 'flag_count', v_count);
end;
$function$;

create or replace function public.reply_feedback_post(p_post_id uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare v_me uuid := auth.uid(); v_id uuid; v_staff boolean := false;
begin
  if v_me is null then raise exception 'Not authenticated' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 3000
     or not exists(select 1 from public.feedback_posts where id = p_post_id and category <> 'bug' and (visibility = 'published' or user_id = v_me)) then
    raise exception 'Invalid reply or feedback post' using errcode = '22023';
  end if;
  begin select public.is_app_admin() into v_staff; exception when undefined_function then v_staff := false; end;
  insert into public.feedback_post_replies(post_id, author_user_id, body, is_staff) values(p_post_id, v_me, trim(p_body), coalesce(v_staff, false)) returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$function$;

revoke all on function public.get_feedback_board(text, text, text, text, boolean, int, int), public.get_feedback_post(uuid), public.vote_feedback_post(uuid), public.watch_feedback_post(uuid), public.flag_feedback_post(uuid, text), public.reply_feedback_post(uuid, text) from public, anon;
grant execute on function public.get_feedback_board(text, text, text, text, boolean, int, int), public.get_feedback_post(uuid), public.vote_feedback_post(uuid), public.watch_feedback_post(uuid), public.flag_feedback_post(uuid, text), public.reply_feedback_post(uuid, text) to authenticated, service_role;
