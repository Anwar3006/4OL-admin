-- P1-05 · Reviews: attach the orphaned triggers, and let a provider reply
--
-- `fn_enforce_review_depth` and `fn_validate_review_requirements` have
-- existed for some time and are **attached to no table at all**. Both are
-- correct; neither has ever run. So until now:
--
--   * a reply to a reply was accepted, nesting without limit, even though
--     the function to stop it existed;
--   * a top-level review could be inserted with a NULL rating, even though
--     the function to require one existed.
--
-- Attaching them is the whole fix. Their bodies are unchanged apart from
-- pinning `search_path`, which they both lacked — a mechanical, zero-
-- behaviour change matching what P0-13 did to five other functions.
--
-- Both stay SECURITY INVOKER. `fn_validate_review_requirements` reads the
-- author's own `user_profiles` row to spot an admin note, which the caller
-- can already see, and making it DEFINER would break the `current_user`
-- reasoning documented on P0-01b's guard.

create or replace function public.fn_enforce_review_depth()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
BEGIN
    IF NEW.parent_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.facility_reviews
            WHERE id = NEW.parent_id AND parent_id IS NOT NULL
        ) THEN
            RAISE EXCEPTION 'Nesting limit reached: You cannot reply to a reply.';
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

create or replace function public.fn_validate_review_requirements()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
DECLARE
    v_user_role text;
BEGIN
    SELECT role INTO v_user_role FROM public.user_profiles WHERE user_id = NEW.user_id;

    IF v_user_role IN ('admin', 'super_admin', 'registrar') THEN
        RETURN NEW;
    END IF;

    IF NEW.parent_id IS NULL AND NEW.rating IS NULL THEN
        RAISE EXCEPTION 'Users must provide a star rating for new reviews.';
    END IF;

    RETURN NEW;
END;
$function$;

drop trigger if exists trg_enforce_review_depth on public.facility_reviews;
create trigger trg_enforce_review_depth
  before insert or update on public.facility_reviews
  for each row
  execute function public.fn_enforce_review_depth();

drop trigger if exists trg_validate_review_requirements on public.facility_reviews;
create trigger trg_validate_review_requirements
  before insert on public.facility_reviews
  for each row
  execute function public.fn_validate_review_requirements();

-- Marks a reply as coming from the business rather than another patient.
-- Without it the app cannot tell "the pharmacy answered" from "a second
-- customer chipped in", and both render identically.
alter table public.facility_reviews
  add column if not exists is_provider_reply boolean not null default false;

comment on column public.facility_reviews.is_provider_reply is
  'True when this row is a business owner/manager answering a review (P1-05, reply_to_review). Renders as an official reply.';

/**
 * Reply to a review as the business.
 *
 * An RPC rather than a direct insert, even though "Users manage own reviews"
 * would technically allow the row: that policy only checks that the author is
 * writing as themselves. It does NOT check that they have anything to do with
 * the provider being reviewed, so under it any user could post a reply the UI
 * would badge as coming from the business. The ownership check has to live
 * somewhere, and a policy saying `auth.uid() = user_id` is the wrong place.
 *
 * `parent_id` and the depth trigger above do the rest: a reply to a reply is
 * refused by the database, not by this function.
 */
create or replace function public.reply_to_review(
  p_review_id uuid,
  p_text text
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_provider_id uuid;
  v_parent_id uuid;
  v_text text := nullif(trim(p_text), '');
  v_id uuid;
begin
  select r.facility_id, r.parent_id into v_provider_id, v_parent_id
  from public.facility_reviews r where r.id = p_review_id;

  if v_provider_id is null then
    raise exception 'Review not found' using errcode = 'P0002';
  end if;
  if v_parent_id is not null then
    raise exception 'You cannot reply to a reply' using errcode = '22023';
  end if;
  if v_text is null then
    raise exception 'A reply needs some text' using errcode = '22023';
  end if;

  -- `profile.edit`: answering a customer in public is speaking for the
  -- business, the same authority as editing its public profile.
  if not public.is_provider_member(v_provider_id, 'profile.edit') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  insert into public.facility_reviews
    (facility_id, user_id, parent_id, comment_text, is_provider_reply, status)
  values
    (v_provider_id, (select auth.uid()), p_review_id, v_text, true, 'approved')
  returning id into v_id;

  return v_id;
end;
$function$;

revoke execute on function public.reply_to_review(uuid, text) from public, anon;
grant execute on function public.reply_to_review(uuid, text) to authenticated;
