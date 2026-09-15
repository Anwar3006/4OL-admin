-- idx_period_trivia_submissions_rank already existed (event_id, score desc,
-- duration_seconds, submitted_at) but was missing the final `id` tiebreak
-- column — recreate it rather than leaving a same-named CREATE INDEX to
-- collide. duration_seconds/submitted_at/id ASC already sort nulls last by
-- Postgres default, so no explicit "nulls last" is needed.
drop index if exists idx_period_trivia_submissions_rank;
create index idx_period_trivia_submissions_rank
  on public.period_trivia_submissions (event_id, score desc, duration_seconds, submitted_at, id);

-- The comparator, expressed in exactly one place, so the live leaderboard
-- query and close_period_trivia_event below both read from the same
-- ordering instead of two hand-typed ORDER BYs that can drift apart.
create or replace view public.period_trivia_ranked_submissions as
select
  s.*,
  row_number() over (
    partition by s.event_id
    order by s.score desc, s.duration_seconds asc, s.submitted_at asc, s.id asc
  ) as rnk,
  count(*) over (partition by s.event_id) as total_participants
from public.period_trivia_submissions s;

revoke all on public.period_trivia_ranked_submissions from anon, authenticated;
grant select on public.period_trivia_ranked_submissions to service_role;

comment on view public.period_trivia_ranked_submissions is
  'The one place score desc / duration asc / submitted_at asc / id asc is expressed — read by both the live leaderboard and close_period_trivia_event.';

-- Closes a trivia event: freezes the ranking, walks reward_tiers in
-- tier_order applying the non-stackable cascade + stackable overlay, and
-- creates reward_grants + period_trivia_fulfillment rows. Bookkeeping only —
-- it never calls award_fitcoins or touches period_premium_grants, even for
-- rewards marked fulfillment_method='automatic'. Keeping this a pure,
-- side-effect-free function of submissions+tiers is what makes it safe to
-- re-run; an "automatic rewards actually get disbursed" worker that watches
-- reward_grants for awarded+automatic rows is a clean, reusable follow-up,
-- deliberately out of scope here.
create or replace function public.close_period_trivia_event(p_event_id uuid, p_closed_by uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.period_trivia_events%rowtype;
  v_tier record;
  v_reward public.reward_catalog%rowtype;
  v_cand record;
  v_already_won uuid[] := '{}';
  v_tiers_processed int := 0;
  v_grants_created int := 0;
  v_fulfillment_created int := 0;
  v_skipped jsonb := '[]'::jsonb;
  v_available int;
  v_remaining int;
  v_taken int;
begin
  select * into v_event from public.period_trivia_events where id = p_event_id for update;
  if v_event.id is null then
    raise exception 'trivia event not found';
  end if;
  if v_event.closed_at is not null then
    return jsonb_build_object('already_closed', true);
  end if;
  if now() < v_event.ends_at then
    raise exception 'this trivia has not ended yet';
  end if;

  create temporary table if not exists tier_candidates (
    user_id uuid, submission_id uuid, ord int
  ) on commit drop;

  for v_tier in
    select * from public.reward_tiers
    where source_domain = 'trivia' and source_id = p_event_id
    order by tier_order asc
  loop
    v_tiers_processed := v_tiers_processed + 1;
    truncate table tier_candidates;
    select * into v_reward from public.reward_catalog where id = v_tier.reward_id;

    -- Rank-based criteria always read the single global rank for the whole
    -- event (period_trivia_ranked_submissions.rnk) — never re-ranked within a
    -- shrinking pool. A "1st-3rd", then "4th-10th" pair of tiers only makes
    -- sense this way; re-ranking the remaining pool after each tier would
    -- make "top 10" a moving target.
    if v_tier.criteria_type = 'top_n_ranked' then
      insert into tier_candidates
      select s.user_id, s.id, s.rnk from public.period_trivia_ranked_submissions s
      where s.event_id = p_event_id and s.user_id is not null
        and s.rnk <= coalesce((v_tier.criteria_params->>'n')::int, 0)
      order by s.rnk;
    elsif v_tier.criteria_type = 'rank_range' then
      insert into tier_candidates
      select s.user_id, s.id, s.rnk from public.period_trivia_ranked_submissions s
      where s.event_id = p_event_id and s.user_id is not null
        and s.rnk between coalesce((v_tier.criteria_params->>'from')::int, 1) and coalesce((v_tier.criteria_params->>'to')::int, 0)
      order by s.rnk;
    elsif v_tier.criteria_type = 'perfect_score' then
      insert into tier_candidates
      select s.user_id, s.id, s.rnk from public.period_trivia_ranked_submissions s
      where s.event_id = p_event_id and s.user_id is not null and s.score = s.question_count
      order by s.rnk;
    elsif v_tier.criteria_type = 'min_score' then
      insert into tier_candidates
      select s.user_id, s.id, s.rnk from public.period_trivia_ranked_submissions s
      where s.event_id = p_event_id and s.user_id is not null
        and s.score >= coalesce((v_tier.criteria_params->>'min')::int, 0)
      order by s.rnk;
    elsif v_tier.criteria_type = 'fastest_perfect_n' then
      insert into tier_candidates
      select s.user_id, s.id, s.rnk from public.period_trivia_ranked_submissions s
      where s.event_id = p_event_id and s.user_id is not null and s.score = s.question_count
      order by s.rnk
      limit coalesce((v_tier.criteria_params->>'n')::int, 0);
    elsif v_tier.criteria_type = 'all_participants' then
      insert into tier_candidates
      select s.user_id, s.id, s.rnk from public.period_trivia_ranked_submissions s
      where s.event_id = p_event_id and s.user_id is not null
      order by s.rnk;
    elsif v_tier.criteria_type = 'random_draw' then
      -- Deterministic on (seed, user_id) rather than setseed()+random(),
      -- which would leak session-level PRNG state across other calls in the
      -- same transaction and isn't guaranteed reproducible across replans.
      insert into tier_candidates
      select x.user_id, x.submission_id, x.ord from (
        select s.user_id, s.id as submission_id,
          row_number() over (order by md5(coalesce(v_tier.criteria_params->>'seed', '') || ':' || s.user_id::text)) as ord
        from public.period_trivia_ranked_submissions s
        where s.event_id = p_event_id and s.user_id is not null
          and s.score >= coalesce((v_tier.criteria_params->>'min_score')::int, 0)
      ) x
      order by x.ord
      limit coalesce((v_tier.criteria_params->>'n')::int, 0);
    end if;

    if not v_tier.stackable then
      delete from tier_candidates where user_id = any(v_already_won);
    end if;

    v_available := coalesce(v_tier.max_winners, 2147483647);
    if v_reward.inventory_count is not null then
      select count(*) into v_taken from public.reward_grants
      where reward_id = v_tier.reward_id and status <> 'cancelled';
      v_remaining := greatest(0, v_reward.inventory_count - v_taken);
      v_available := least(v_available, v_remaining);
    end if;

    v_taken := 0;
    for v_cand in select * from tier_candidates order by ord loop
      if v_taken >= v_available then
        v_skipped := v_skipped || jsonb_build_object('tier_label', v_tier.tier_label, 'user_id', v_cand.user_id, 'reason', 'inventory_or_cap_exhausted');
        continue;
      end if;

      insert into public.reward_grants (reward_id, user_id, source_domain, source_type, source_id, status, reward_snapshot)
      values (v_tier.reward_id, v_cand.user_id, 'trivia', 'trivia_event', p_event_id, 'awarded', to_jsonb(v_reward))
      on conflict (source_domain, source_type, source_id, user_id, reward_id) where source_id is not null and status <> 'cancelled' do nothing;
      if found then v_grants_created := v_grants_created + 1; end if;

      insert into public.period_trivia_fulfillment (event_id, submission_id, user_id, tier_label, reward_id, prize_status)
      values (p_event_id, v_cand.submission_id, v_cand.user_id, v_tier.tier_label, v_tier.reward_id, 'pending')
      on conflict (event_id, submission_id, tier_label) do nothing;
      if found then v_fulfillment_created := v_fulfillment_created + 1; end if;

      v_taken := v_taken + 1;
      if not v_tier.stackable then
        v_already_won := array_append(v_already_won, v_cand.user_id);
      end if;
    end loop;
  end loop;

  update public.period_trivia_events
  set status = 'ended', closed_at = now(), updated_at = now()
  where id = p_event_id;

  return jsonb_build_object(
    'already_closed', false,
    'tiers_processed', v_tiers_processed,
    'grants_created', v_grants_created,
    'fulfillment_created', v_fulfillment_created,
    'skipped_for_inventory', v_skipped
  );
end;
$$;

revoke all on function public.close_period_trivia_event(uuid, uuid) from public, anon, authenticated;
grant execute on function public.close_period_trivia_event(uuid, uuid) to service_role;
