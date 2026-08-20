-- Lets server code ask "does an account already exist for this email?" without
-- pulling the whole user list down.
--
-- Why this is needed: createAdminInvite (actions/authenticate.actions.ts) used
-- to answer that question with `.from("user").select("id").eq("email", …)` —
-- the BetterAuth table, which holds 2 stale rows against 9 real users, so the
-- check never matched and duplicate invites could be issued to people who
-- already had accounts.
--
-- The obvious repoint (user_profiles) is not possible: user_profiles has no
-- email column at all. Email exists only in auth.users, which PostgREST does
-- not expose, hence a SECURITY DEFINER function. The alternative in use
-- elsewhere in this codebase — admin.auth.admin.listUsers({ perPage: 1000 }) —
-- is O(all users) per check and silently wrong past 1000 accounts.

CREATE OR REPLACE FUNCTION public.auth_user_exists_by_email(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
     WHERE lower(email) = lower(trim(p_email))
       AND deleted_at IS NULL
  );
$$;

-- service_role only: this is a server-side check, and exposing an
-- email-enumeration oracle to anon/authenticated would be a gift to anyone
-- probing which addresses have accounts.
REVOKE ALL ON FUNCTION public.auth_user_exists_by_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_user_exists_by_email(text) FROM anon;
REVOKE ALL ON FUNCTION public.auth_user_exists_by_email(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_exists_by_email(text) TO service_role;
