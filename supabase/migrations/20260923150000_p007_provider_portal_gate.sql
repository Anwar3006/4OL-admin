-- P0-07 · `provider_portal` gates public self-onboarding
-- P1-03 · somewhere to keep a vendor's delivery settings (Sheet 05, screen 5)
--
-- Two small, unrelated-but-adjacent pieces, both needed by the Business app.
--
-- ── 1. Reading a flag from a mobile app ──────────────────────────────────
--
-- `feature_flags` has RLS on with NO policies and NO grants to anon or
-- authenticated, so neither app can read it at all. PostHog is the real
-- evaluation engine for the patient app (P0-07), but the Business app has no
-- PostHog client and the screen that needs gating — "Request access" on the
-- welcome screen — runs signed out, before any account exists.
--
-- So: a narrow SECURITY DEFINER reader over an explicit allow-list. It
-- returns one boolean for one named flag and nothing else, so it cannot be
-- used to enumerate the 23 internal PostHog flags this table also mirrors.
--
-- ── 2. Enforcing it ──────────────────────────────────────────────────────
--
-- Hiding the button is not a gate. P0-05's entitlement bug in this same
-- codebase was exactly this shape — a client-side-only check — so the refusal
-- is a trigger on the table the button writes to. It keys on the `source`
-- marker the Business app already stamps into `metadata`, which is why the
-- admin console's own inserts and the existing web onboarding path are
-- untouched by it.

/**
 * Is a public, client-gated feature flag on?
 *
 * `enabled` mirrors PostHog's `active` bit literally and `rollout_percentage`
 * is independent of it (P0-07, `lib/posthog-admin.ts`'s `effectiveFlagState`),
 * so `active: true` + `rollout 0` is the documented "staged, not live yet"
 * state. A boolean gate has to fold both together, and 0% means nobody.
 *
 * The allow-list is deliberate: flag names come from the caller, and this
 * function is reachable by `anon`. Add a flag here only when a mobile app
 * genuinely needs to branch on it.
 */
create or replace function public.is_feature_enabled(p_name text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce(
    (
      select f.enabled and coalesce(f.rollout_percentage, 100) > 0
      from public.feature_flags f
      where f.name = p_name
        and p_name in ('provider_portal', 'rx_epharmacy')
    ),
    false
  );
$$;

revoke execute on function public.is_feature_enabled(text) from public;
grant execute on function public.is_feature_enabled(text) to anon, authenticated;

/**
 * Refuses a Business-app self-onboarding request while `provider_portal` is
 * off, for callers who are not staff.
 *
 * Scoped by the `source` marker rather than by the table, so this cannot
 * affect the admin console's Add Facility / Approve flows (service role, and
 * no such marker) or the older web onboarding path.
 *
 * SECURITY INVOKER, deliberately, and for the same reason P0-01b's
 * `protect_user_profile_columns` is: inside a SECURITY DEFINER function
 * `current_user` is the function's OWNER, not the caller, so the
 * `current_user in ('authenticated','anon')` test below would match nobody
 * and the gate would let every insert through. That is not theoretical —
 * this function was written SECURITY DEFINER first and the dry run caught
 * exactly that, an anon insert sailing past a flag that was off.
 *
 * Running as invoker is why the flag is read through `is_feature_enabled()`
 * rather than off `feature_flags` directly: the table has no grants to anon
 * or authenticated, and that function is the SECURITY DEFINER window onto it.
 */
create or replace function public.fn_guard_provider_portal_onboarding()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if coalesce(new.metadata ->> 'source', '') <> 'business_app_request_access' then
    return new;
  end if;
  -- Staff and server-side callers are never gated by a rollout flag.
  if current_user not in ('authenticated', 'anon') or public.is_app_admin() then
    return new;
  end if;
  if not public.is_feature_enabled('provider_portal') then
    raise exception 'Self-onboarding is not open yet'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.fn_guard_provider_portal_onboarding() from public, anon, authenticated;

drop trigger if exists trg_guard_provider_portal_onboarding on public.onboarding_requests;
create trigger trg_guard_provider_portal_onboarding
  before insert on public.onboarding_requests
  for each row
  execute function public.fn_guard_provider_portal_onboarding();

-- ── 3. Delivery settings (Sheet 05, screen 5) ────────────────────────────
--
-- Sheet 05's last screen edits: offer delivery, radius, delivery fee, free
-- delivery over, minimum order, offer pickup, pickup hours. None of those
-- columns exist on `providers`, so the screen had nowhere to write.
--
-- One additive jsonb column, following `providers.business_hours`, which is
-- the same kind of owner-edited settings blob. A column per field would be
-- seven migrations' worth of churn for something only this screen reads.

alter table public.providers
  add column if not exists delivery_settings jsonb;

comment on column public.providers.delivery_settings is
  'Vendor fulfilment settings edited on Sheet 05 screen 5: offers_delivery, '
  'delivery_radius_km, delivery_fee, free_delivery_over, minimum_order, '
  'offers_pickup, pickup_hours. Written only through update_my_provider.';

-- P0-02 made `providers` admin-only for UPDATE, so an owner reaches this
-- exclusively through this RPC. Identical shape to the `business_hours` line
-- directly above it; every other column in the allow-list is unchanged.
create or replace function public.update_my_provider(p_id uuid, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not exists (
    select 1 from public.providers where id = p_id and owner_id = (select auth.uid())
  ) then
    raise exception 'Not your provider';
  end if;

  update public.providers
  set
    name = coalesce(p_patch->>'name', name),
    description = coalesce(p_patch->>'description', description),
    business_hours = coalesce(p_patch->'business_hours', business_hours),
    delivery_settings = coalesce(p_patch->'delivery_settings', delivery_settings),
    contact_number = coalesce(p_patch->>'contact_number', contact_number),
    whatsapp_number = coalesce(p_patch->>'whatsapp_number', whatsapp_number),
    email = coalesce(p_patch->>'email', email),
    media_urls = coalesce(p_patch->'media_urls', media_urls),
    featured_image_url = coalesce(p_patch->>'featured_image_url', featured_image_url),
    amenities = coalesce(p_patch->'amenities', amenities),
    keywords = coalesce(p_patch->'keywords', keywords),
    updated_at = now()
  where id = p_id;
end;
$function$;
