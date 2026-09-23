-- ROLLBACK for p105_reviews_and_replies
--
-- Detaches the two review triggers, returning them to the orphaned state they
-- were in: present, correct, and never running. That means a reply to a reply
-- is accepted again and a top-level review can be inserted with no rating.
--
-- The functions themselves are left in place (restored to their original
-- unpinned `search_path`) rather than dropped — they were never dropped
-- before, and something may yet attach them.
--
-- `is_provider_reply` is dropped last. Existing provider replies survive as
-- rows but lose their badge and render as ordinary customer comments, which
-- is the confusion the column exists to prevent — so prefer leaving the
-- column in place if any replies have been written.

drop trigger if exists trg_validate_review_requirements on public.facility_reviews;
drop trigger if exists trg_enforce_review_depth on public.facility_reviews;
drop function if exists public.reply_to_review(uuid, text);

create or replace function public.fn_enforce_review_depth()
returns trigger language plpgsql as $function$
BEGIN
    IF NEW.parent_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public.facility_reviews
                   WHERE id = NEW.parent_id AND parent_id IS NOT NULL) THEN
            RAISE EXCEPTION 'Nesting limit reached: You cannot reply to a reply.';
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

create or replace function public.fn_validate_review_requirements()
returns trigger language plpgsql as $function$
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

alter table public.facility_reviews drop column if exists is_provider_reply;
