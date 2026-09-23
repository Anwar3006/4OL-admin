-- P0-16 · Business → Security: devices a provider can actually manage
--
-- Three problems with the existing device functions, all of which show up the
-- moment the Business app gets a "Signed-in devices" screen.
--
-- 1. `list_my_devices()` IS NOT APP-SCOPED. It returns every
--    `user_push_tokens` row for the user, and P0-15 added the `app` column
--    precisely to keep the patient app and the Business app apart. It
--    predates that column and was never updated. For a `{member,provider}`
--    owner the Business app would list their PERSONAL phone alongside the
--    shop's counter phones, and revoking it there would silently stop their
--    own medication reminders.
--
-- 2. `is_current` IS HARD-CODED `false`. Nothing can tell you which row is
--    the phone in your hand. On a counter shared by several staff that is the
--    single most useful column on the screen — "which of these is this one?"
--    — and on the patient app it has always rendered as no device being
--    current.
--
-- 3. THERE IS NO "SIGN OUT EVERYWHERE". P0-16 asks for it. Note what it can
--    and cannot be: deleting push tokens stops notifications, it does NOT end
--    a session. Ending sessions is `supabase.auth.signOut({scope:'global'})`
--    on the client, which revokes the user's refresh tokens in GoTrue. This
--    migration covers the token half; the app pairs the two.
--
-- Threat model this serves (D14): staff share ONE login on shared counter
-- phones. The owner needs to see every phone signed in as the business and be
-- able to evict one that has walked off, without touching their own phone.

-- ─────────────────────────────────────────────────────────────────────────
-- `list_my_devices` — app-scoped, with a real `is_current`
--
-- DROP first, deliberately. `CREATE OR REPLACE` does NOT replace a function
-- when the parameter list changes shape: a new defaulted parameter makes a
-- distinct overload, and both would then be live. That is the exact trap
-- P0-15 hit with `register_push_token` and `dispatch_notification`, caught
-- only by a duplicate-row error. Dropping the 0-arg signature first means the
-- patient app's existing no-arg `list_my_devices()` call binds to the new
-- function through the defaults, unchanged.
-- ─────────────────────────────────────────────────────────────────────────

drop function if exists public.list_my_devices();

create or replace function public.list_my_devices(
  p_app text default null,
  p_current_token text default null
)
returns table(
  id uuid,
  device_name text,
  platform text,
  os_version text,
  app_version text,
  last_seen_at timestamp with time zone,
  created_at timestamp with time zone,
  is_current boolean,
  app text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select t.id, t.device_name, t.platform, t.os_version, t.app_version,
         t.last_seen_at, t.created_at,
         -- Real now. Null token (the caller hasn't registered for
         -- notifications yet) can never be "current" — `is distinct from`
         -- would make two nulls match.
         (p_current_token is not null and t.expo_push_token = p_current_token),
         t.app
    from public.user_push_tokens t
   where t.user_id = (select auth.uid())
     -- Null p_app keeps the old behaviour: every app. The patient app calls
     -- it with no arguments and is unaffected.
     and (p_app is null or t.app = p_app)
   order by t.last_seen_at desc;
$function$;

revoke execute on function public.list_my_devices(text, text) from public;
grant execute on function public.list_my_devices(text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- "Sign out every other device"
-- ─────────────────────────────────────────────────────────────────────────

/**
 * Removes the caller's push tokens for one app, optionally keeping the phone
 * running this call.
 *
 * Scoped by `p_app` so the Business app's "Sign out all other devices" cannot
 * reach into the owner's personal phone — the same separation `list_my_devices`
 * above now honours. Passing null for `p_app` clears every app, which is what
 * a patient-side "sign out everywhere" would want.
 *
 * This is the TOKEN half only. It stops notifications and removes the device
 * from the approval set; it does not end a session. The caller pairs it with
 * `supabase.auth.signOut({scope: 'global'})`, which revokes refresh tokens in
 * GoTrue — the two together are what "signed out everywhere" means.
 */
create or replace function public.revoke_my_other_devices(
  p_app text default null,
  p_keep_token text default null
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_deleted int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  delete from public.user_push_tokens t
   where t.user_id = v_user_id
     and (p_app is null or t.app = p_app)
     and (p_keep_token is null or t.expo_push_token <> p_keep_token);

  get diagnostics v_deleted = row_count;

  -- Keeps the legacy single-slot `user_profiles.expo_push_token` in step.
  -- P0-15 restricted its source to consumer rows, so a business-only sweep
  -- correctly leaves the patient-side fallback alone.
  perform public.sync_legacy_push_token(v_user_id);

  return v_deleted;
end;
$function$;

revoke execute on function public.revoke_my_other_devices(text, text) from public;
grant execute on function public.revoke_my_other_devices(text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Tighten `register_push_token`
--
-- It carries `EXECUTE ... TO PUBLIC`, which includes `anon`. It is SECURITY
-- DEFINER and resolves the user from `auth.uid()`, so an anonymous call
-- cannot write a row for somebody else — but a PUBLIC grant on a SECURITY
-- DEFINER function is exactly the class of leftover P0-15 swept up on
-- `dispatch_notification` and P0-13 on `admin_global_search`. There is no
-- evidenced anon caller: registering a push token requires a signed-in user
-- by construction.
-- ─────────────────────────────────────────────────────────────────────────

revoke execute on function public.register_push_token(text, text, text, text, text, text) from public, anon;
grant execute on function public.register_push_token(text, text, text, text, text, text) to authenticated;
