# Top Rated Normalization — Master Plan

**Goal:** Replace the single `facility_profile.is_top_rated` /
`facility_profile.avg_rating` column pair with one normalized,
cross-module `top_rated_items` table — a single source of truth that the
mobile home/index "Top Rated" shelf queries directly, instead of each
module (facilities, outdoor routes, outdoor events, challenges,
exercises, fitness plans) needing its own `is_top_rated` boolean.

This also now covers the piece that turned out to be missing when this
was investigated: facilities don't yet have a real subscription
*enrollment* — only a tier catalog exists. Step 1 builds just enough of
that enrollment layer to gate `top_rated_placement` (and other
subscription privileges) correctly. It is deliberately **not** a full
billing/payments system — see Step 1's scope note.

This file is a sequence of self-contained prompts, same convention as
`fitness-plan-refactor-plan.md`. Paste each step into a fresh LLM turn (or
the same one, sequentially). Each step names the exact files it touches
and what "done" looks like, so it can be verified before moving to the
next.

---

## Grounding — what's actually there today

Confirmed by reading the repos directly:

- **`facility_profile`** already has `is_top_rated` (boolean) and
  `avg_rating` (numeric) columns. The mobile hook `useTopRatedFacilities`
  (`4-Our-Life-App/hooks/use-facilities.ts`) queries them directly:
  `.eq('is_top_rated', true).order('avg_rating', {ascending: false})`.
  There's also a PostGIS map RPC, `get_facilities_map`, that accepts a
  `p_is_top_rated` boolean parameter — so top-rated filtering is used in
  at least two places, not just the home shelf.
- **The `subscription_privilege` enum already exists**
  (`SUPABASE_SCHEMA.md`): `business_analytics`, `performance_analytics`,
  `popup_notification`, `top_rated_placement`, `featured_placement`,
  `ad_discount_10/25/30/40/50`, `ad_flyer_discount_10`,
  `advanced_analytics`, `priority_support`. So `top_rated_placement` is
  a defined, real privilege a subscription tier can grant — this is not
  speculative.
- **A subscription tier *catalog* already exists and is fully built**:
  the `marketing_subscriptions` table (name, description, `tier_type`,
  `price`, `period`, `billing_cycle`, `privileges` — an array presumably
  drawn from `subscription_privilege` — `tier_limit`, `is_active`), with
  real CRUD: `hooks/supabase-calls/useSubscriptions.ts`
  (`useMarketingSubscriptions`/`useCreateMarketingSubscription`/
  `useUpdateMarketingSubscription`), an admin `SubscriptionsTab.tsx`
  under `(dashboard)/marketing/`, and `add-subscription-dialog.tsx` /
  `view-subscription-dialog.tsx`. **Note:** there is a second,
  *different* file also exporting a function called
  `useMarketingSubscriptions`
  (`hooks/supabase-calls/useMarketingSubscriptions.ts`, a simpler
  read-only version). Two same-named exports from different files is a
  real landmine for whichever step touches this area next — resolve
  which one is actually imported where, and consider renaming/removing
  the duplicate as a small cleanup, before adding a third
  subscription-adjacent hook file on top of this confusion.
- **What does NOT exist: a facility ↔ tier enrollment record.**
  `facility_profile` has no subscription/tier foreign key. The
  "Subscriptions" table shown in
  `app/(dashboard)/transactions/_components/SubscriptionsTab.tsx` is
  **hardcoded mock data** (`const subs: SubscriptionRow[] = [{id:
  "SUB-8812", ...}, ...]`, fake KPI values like `"₵87,400"`) — not
  wired to any real table. This is the same "hardcoded dashboard
  replaced later with a real hook" pattern this codebase has hit before
  (see the fitness dashboard KPI cards). So: no facility is actually
  "enrolled" in anything today, anywhere, in a way the database can see.
  Step 1 builds this.
- **`facility_offerings`** exists (per the 52-table list) with an
  `offering_type` enum containing `subscription`, `walk-in`, `package`,
  `onetime_fee`. Do not assume this is the platform-to-facility
  subscription layer — the enum's other values (`walk-in`, `package`,
  `onetime_fee`) read like a *facility's own service offerings to its
  patients* (e.g., a clinic offering a monthly checkup subscription to
  patients), a completely different concept from a facility paying the
  platform for placement. Step 1 confirms this distinction by actually
  reading `facility_offerings`' columns before building anything
  alongside it, to avoid colliding with or duplicating an unrelated
  feature.
- **Only `facility_profile` has a top-rated mechanism today.** The other
  modules the mobile home page might want to feature — outdoor routes
  and events (which already have their own review system:
  `fitness_outdoor_reviews`, with `route_id`, `rating`, `comment`,
  moderation status — see `add-outdoor-review-dialog.tsx`), challenges,
  `fitness_exercises` (the workout library), and `fitness_plans` (which
  already has `average_rating`/`rating_count`/`is_featured` from the
  fitness plan refactor) — do **not** have a confirmed `is_top_rated`
  equivalent, and (per the above) none of them are subscription-gated —
  only facilities monetize placement this way, at least today. Don't
  assume outdoor routes/challenges will ever need a `source:
  'subscription'` row; that path is facility-only unless someone
  explicitly decides otherwise later.
- **The decision is already made** (per the person's own framing, not
  re-litigated here): a normalized `top_rated_items` table, not a
  per-module boolean column. When a module's row becomes top-rated, a
  row is added here; the home/index page queries this table alone to
  fill the shelf.
- **The shelf is cross-module** — the mobile home/index page's "Top
  Rated" section is meant to show a single mixed list (a facility next
  to an outdoor route next to a challenge, etc.), which is *why* a
  normalized table beats five separate boolean columns: a single
  boolean per module still requires a fan-out UNION query across five
  differently-shaped tables to render one shelf. A single table sidesteps
  that.

### Denormalize display fields, or join per module at read time?

Recommend **denormalizing a small set of display fields directly onto
`top_rated_items`** (title, subtitle, image_url, rating, a route/link
descriptor) rather than having the mobile client join back to five
different source tables to render one shelf. Reasoning, same as the
`fitness_plan_days.target_muscles` precedent from the fitness plan
refactor: the alternative is the client doing up to 5 different queries
(or a Postgres view doing 5 different `LEFT JOIN`s against
differently-shaped tables) just to paint one horizontal shelf of cards.
A denormalized snapshot means one query, ordered/paginated trivially,
regardless of module mix. The tradeoff — display fields can go stale if
the source item's title/image changes — is handled by re-syncing the
snapshot from the source row whenever admin curation touches it (Step 2
does this), not by a scheduled job. If a field drifts between admin
touches, that's an acceptable staleness window for a "top rated" merch
shelf, not a source of truth problem (the FK back to the source row is
always there for anything that needs the live data, e.g. tapping through
to the actual facility/route/plan detail screen).

---

## Step 0 — Investigation + `top_rated_items` schema migration

**Files:** new `.sql` file in
`/Users/anwarsadat/Desktop/WORK/top_rated_schema_migration.sql`, same
raw-SQL-by-hand convention as `enable_rls.sql` /
`streaks_and_view_counts.sql` / `fitness_plan_schema_migration.sql`.

**Prompt:**

> Before writing any DDL, investigate and document (as comments at the
> top of the migration file) the following — do not assume, confirm by
> reading the actual schema/RPC/admin-action code:
>
> 1. What actually sets `facility_profile.is_top_rated` today? Grep the
>    admin dashboard (`4-Our-Life/`) for every write to `is_top_rated` —
>    is it a manual admin toggle, or is there any existing (even
>    partial/dead) code path attempting to tie it to
>    `top_rated_placement`? (Given Step 1 below is about to build the
>    subscription-enrollment layer from scratch, it's likely there's
>    currently no working subscription-driven path at all — confirm
>    that rather than assume it, since if some earlier partial attempt
>    exists it needs to be reconciled with, not silently duplicated.)
>    Also check whether `avg_rating` itself is a stored column updated
>    by a trigger (likely, off `facility_reviews`) or computed on read.
> 2. Confirm the current schema of each of these tables (do not reuse
>    assumptions from `fitness-plan-refactor-plan.md` without
>    re-checking — that document is now known-stale in places): the
>    outdoor routes table (`fitness_outdoor_routes` or similar — find
>    its real name), `fitness_outdoor_events`, whatever table backs
>    "challenges" in `_tabs`/`add-challenge-dialog.tsx`, and
>    `fitness_exercises`. Specifically check: does each already have
>    any rating/popularity signal (`average_rating`, `rating_count`,
>    `view_count`, `completion_count`, `is_featured` — `fitness_plans`
>    and `fitness_exercises` are known to have some of these from the
>    fitness plan refactor; confirm which, exactly, on each table)?
>
> With that grounding, write a migration that:
>
> 1. Creates `top_rated_items`:
>    - `id uuid primary key default gen_random_uuid()`
>    - `module text not null check (module in ('facility', 'outdoor_route',
>      'outdoor_event', 'challenge', 'exercise', 'fitness_plan'))` — add
>      or remove values based on what Step 4/later admin curation
>      actually needs to support; don't over-scope to modules nobody
>      asked to feature yet.
>    - `item_id uuid not null` — the source row's id. No FK constraint
>      across modules (Postgres FKs can't conditionally point at
>      different tables based on another column's value) — integrity is
>      enforced at the application layer in Step 2, not the DB. Add a
>      comment explaining this explicitly so a future reader doesn't
>      "fix" it by trying to add one.
>    - A **unique constraint on `(module, item_id)`** — the same item
>      can't be top-rated twice.
>    - Denormalized display fields (per the "Grounding" recommendation
>      above): `title text not null`, `subtitle text`, `image_url text`,
>      `rating numeric`, `rating_count integer`.
>    - `source text not null check (source in ('manual', 'subscription',
>      'rating_threshold'))` — only include values Step 0's own
>      investigation (point 1 above) actually found in use; don't invent
>      a taxonomy the codebase doesn't need yet. Given the grounding
>      above, `'subscription'` will realistically only ever apply where
>      `module = 'facility'`.
>    - `rank integer` nullable — lets an admin manually order the shelf;
>      null means "sort by rating/added_at instead," same nullable/
>      fallback pattern as `fitness_plans.style_tag`.
>    - `added_by uuid` (admin's user_id, nullable — null for
>      trigger/subscription-sourced rows), `added_at timestamptz not
>      null default now()`, `updated_at timestamptz not null default
>      now()` with the standard `update_updated_at_column()` trigger
>      (already exists per `enable_rls.sql` — reuse it, don't redefine).
> 2. Adds indexes: on `(module)` alone (for admin's per-module curation
>    view), and on `(rank, rating desc, added_at desc)` for the shelf's
>    actual read/sort pattern.
> 3. Enables RLS: authenticated users get SELECT-only (`true` — this is
>    shared curated content, not user-owned rows, same reasoning as
>    `fitness_plan_rls_fix.sql`'s policies for `fitness_plans`/
>    `fitness_plan_days`); writes go through the admin/service-role
>    backend only, so no INSERT/UPDATE/DELETE policy for `authenticated`.
> 4. Does **NOT** touch `facility_profile.is_top_rated`/`avg_rating` yet
>    — leave them alone, still live, until Step 5's backfill has run and
>    Step 2's write path is confirmed working end to end. Say so in a
>    comment, same "deprecated, not deleted, until a later cleanup step"
>    pattern as the fitness plan refactor used for
>    `fitness_generated_workouts`.

---

## Step 1 — Facility subscription enrollment (new — the missing layer)

**Scope note, read this first:** this step builds *only* enough
subscription-enrollment state to correctly gate privileges like
`top_rated_placement` — a real `facility_subscriptions` table, tier
lookups, and a privilege-check helper. It deliberately does **not**
include: payment gateway integration, invoicing, proration on
upgrade/downgrade, dunning/failed-payment retries, or renewal
notifications. Those are a separate, larger "billing & payments"
initiative for later, as already agreed. Building the full thing here
would block top-rated on a much bigger project it doesn't actually
depend on.

**Files:** new `.sql` file at
`/Users/anwarsadat/Desktop/WORK/facility_subscription_enrollment_migration.sql`;
new admin hooks/dialogs under
`4-Our-Life/hooks/supabase-calls/useFacilitySubscriptions.ts` and
`4-Our-Life/app/(dashboard)/marketing/_components/` (or wherever the
investigation below determines facility-subscription admin actions
should live — likely alongside the existing facility approval flow
rather than under `marketing/`, since this is about a facility's own
paid status, not a marketing campaign; decide based on where
`admin_change_facility_status` and similar facility-lifecycle actions
already live).

**Prompt:**

> 1. First, read `facility_offerings`' actual columns (per the Grounding
>    note above) and confirm it is *not* already the table this step
>    needs — i.e. confirm it's patient-facing service offerings, not
>    platform-tier enrollment. If it turns out to already be the right
>    table under a confusing name, adapt this step to extend it instead
>    of creating a parallel one; don't build a duplicate.
> 2. Resolve the `useMarketingSubscriptions` duplicate-export collision
>    noted in Grounding (`useSubscriptions.ts` vs.
>    `useMarketingSubscriptions.ts`) before adding more subscription
>    code to this area — pick one, redirect imports, delete the other,
>    as a small preparatory cleanup so a third similarly-named file
>    isn't added on top of an already-confusing pair.
> 3. Create `facility_subscriptions`:
>    - `id uuid primary key default gen_random_uuid()`
>    - `facility_id uuid not null references facility_profile(id)`
>    - `subscription_id uuid not null references marketing_subscriptions(id)`
>      — the tier being enrolled in.
>    - `status text not null check (status in ('active', 'expired',
>      'cancelled', 'pending_payment')) default 'pending_payment'`
>    - `started_at timestamptz not null default now()`
>    - `current_period_end timestamptz` — nullable only if a tier can be
>      indefinite; otherwise required. Confirm against
>      `marketing_subscriptions.period`/`billing_cycle` semantics
>      (investigate what values those columns actually hold today —
>      e.g. `'monthly'`/`'yearly'` — before deciding how
>      `current_period_end` gets computed at enrollment time).
>    - `billing_cycle text` — **snapshot** the tier's billing cycle at
>      enrollment time rather than joining live to
>      `marketing_subscriptions.billing_cycle` for this; if an admin
>      edits the tier catalog later, existing enrollments should keep
>      what the facility actually signed up for, not silently change
>      underneath them.
>    - `auto_renew boolean not null default true`
>    - `cancelled_at timestamptz`
>    - `created_at`/`updated_at` with the standard trigger.
>    - A **partial unique index**: `create unique index on
>      facility_subscriptions (facility_id) where status = 'active'` —
>      a facility can only have one active subscription at a time. This
>      also naturally prevents the race of two admins concurrently
>      activating two different tiers for the same facility.
> 4. Add a SQL helper function,
>    `facility_has_privilege(p_facility_id uuid, p_privilege
>    subscription_privilege) returns boolean`, that joins
>    `facility_subscriptions` (status = 'active' and
>    `current_period_end > now()`, or null if indefinite) to
>    `marketing_subscriptions` and checks whether `p_privilege = any
>    (privileges)`. This is deliberately generic — not
>    `top_rated`-specific — because `subscription_privilege` already
>    has other values (`business_analytics`, `popup_notification`, ad
>    discounts, etc.) that will want the exact same check later; give
>    Step 2 (and whatever eventually gates those other privileges) one
>    shared, correct place to ask "can this facility do X."
> 5. Add a minimal admin mutation (`useCreateFacilitySubscription` /
>    `useUpdateFacilitySubscriptionStatus` or similar) to manually set a
>    facility's enrollment — since there's no payment gateway yet, this
>    is how admin actually activates a facility's subscription today
>    (same "manual admin action stands in for automation that doesn't
>    exist yet" pattern as `admin_change_facility_status`). Include
>    activate, cancel, and change-tier actions; do not build a
>    self-serve facility-side purchase flow — out of scope per this
>    step's scope note.
> 6. Since `pg_cron` is already an installed extension in this project,
>    add a small scheduled job that flips `status` from `'active'` to
>    `'expired'` for any row where `current_period_end < now()` and
>    `auto_renew = false`. Rows with `auto_renew = true` are left
>    `'active'` for now — actually renewing them requires the payment
>    flow that's out of scope here; leave a clear comment saying so
>    rather than silently expiring auto-renew rows too, which would be
>    wrong once payments exist. Note in a comment that when a
>    subscription does expire, whatever consumes
>    `facility_has_privilege()` (Step 2) needs to notice on its next
>    read — this cron job does not itself need to touch
>    `top_rated_items`; Step 2's own logic re-checks the privilege, it
>    doesn't cache it indefinitely.

---

## Step 2 — Backend: the write path (mark / unmark top-rated)

**Files:** new admin API route(s) — decide the exact path based on
however the admin dashboard's other fitness mutations are structured
(check `PATCH`/`POST` patterns already used by `useDeleteFitnessPlan` /
`useAddFitnessPlanDialog`'s mutation and mirror that convention, e.g. a
Next.js server action or an `/api/admin/top-rated` route — investigate
before choosing, don't default to a new pattern this codebase doesn't
already use elsewhere).

**Prompt:**

> Build the write path for `top_rated_items`:
>
> 1. **Manual admin add/remove**: an authenticated-admin-only mutation
>    that takes `{module, item_id, rank?}`, looks up the source row from
>    the correct table based on `module` (a small switch/lookup — this
>    is the one place polymorphism is handled explicitly, matching Step
>    0's comment that there's no DB-level FK across modules), snapshots
>    `title`/`subtitle`/`image_url`/`rating`/`rating_count` from it into
>    the insert, sets `source: 'manual'`, `added_by: <admin user_id>`.
>    Upsert on `(module, item_id)` so re-adding an already-featured item
>    just refreshes its snapshot instead of erroring. A remove mutation
>    just deletes the `(module, item_id)` row — but see point 2: if the
>    row's `source` is `'subscription'`, block manual removal (subscription
>    wins while active, per the precedence rule below) and return a clear
>    error rather than silently deleting something a paying facility is
>    entitled to.
> 2. **Subscription-driven placement**: whenever Step 1's
>    `useUpdateFacilitySubscriptionStatus` (or the underlying mutation)
>    activates or cancels/expires a facility's subscription, and that
>    subscription's tier `privileges` includes `top_rated_placement`
>    (check via `facility_has_privilege`), upsert or delete the
>    corresponding `top_rated_items` row (`module: 'facility'`, `source:
>    'subscription'`). Precedence: **subscription wins while active** —
>    if a facility both has an active `top_rated_placement` subscription
>    and was separately manually curated, the subscription row is the
>    one that persists; a manual admin removal cannot override an active
>    paid placement (point 1's error case above). If a subscription
>    lapses (cron in Step 1, or manual cancel), delete its
>    `top_rated_items` row — but only if `source = 'subscription'`; don't
>    delete a row that's since been separately manually curated for the
>    same item.
> 3. **Rating-threshold trigger**: do **not** build one. Step 0's own
>    investigation is expected to find no existing organic
>    rating-threshold mechanism for `is_top_rated` — confirm that
>    finding, and if so, explicitly skip this rather than inventing a
>    new auto-promotion mechanism the person hasn't asked for. If Step
>    0's investigation instead turns up a real existing trigger, port it
>    here and update this note.
> 4. A read endpoint (or the existing admin plans-table pattern) for a
>    "Top Rated" admin tab listing current `top_rated_items` rows across
>    all modules, so Step 4 has something to render against.

---

## Step 3 — Mobile: read hook + home/index wiring

**Files:** `4-Our-Life-App/hooks/use-top-rated.ts` (new),
`4-Our-Life-App/app/(app)/(auth)/(tabs)/Home/index.tsx` and
`.../Home/top-rated.tsx`.

**Prompt:**

> Add `useTopRatedItems(options: {module?: string; limit?: number})` in a
> new `hooks/use-top-rated.ts`, querying `top_rated_items` directly
> (`order by rank nulls last, rating desc nulls last, added_at desc`,
> optionally filtered `.eq('module', options.module)` for a
> single-module view). Match the existing infinite-query pagination
> pattern `useTopRatedFacilities` already uses in
> `hooks/use-facilities.ts` (`useInfiniteQuery`,
> `getNextPageParam`/`initialPageParam`), since `Home/top-rated.tsx`'s
> `FlashList` + `onEndReached` wiring already expects that shape — this
> should be closer to a rename/generalize of the existing hook than a
> rewrite.
>
> Update `Home/top-rated.tsx` to render `useTopRatedItems({})` (all
> modules, mixed shelf) instead of `useTopRatedFacilities`. Each card
> needs to render generically off the denormalized
> `title`/`subtitle`/`image_url`/`rating` fields (not `FacilityCard`
> specifically, since items are now mixed-module) and route to the
> correct detail screen based on `module` + `item_id` on tap (a small
> switch, e.g. `module === 'facility'` → facility detail route,
> `module === 'fitness_plan'` → `plan-detail.tsx`, etc. — enumerate
> every module Step 0 actually shipped, not a hypothetical superset).
> Whatever compact card component currently renders on the home/index
> page's own "Top Rated" preview row (check `Home/index.tsx` for how it
> currently surfaces facilities there — likely a smaller preview of the
> same list) needs the same generalization, not just the full
> `top-rated.tsx` screen.

---

## Step 4 — Admin curation UI

**Files:** new `4-Our-Life/app/(dashboard)/top-rated/` page (or a tab
inside an existing relevant dashboard section — check whether a
cross-module admin page already exists anywhere before creating a new
top-level nav entry).

**Prompt:**

> Build the admin-facing counterpart to Step 2's write path: a page that
> lists current `top_rated_items` rows (grouped or filterable by
> `module`), lets an admin manually add an item (search/pick from the
> relevant module's existing table — reuse each module's existing admin
> search/select pattern, e.g. however `add-fitness-plan-dialog.tsx` or
> `user-search-select.tsx` do item lookup, rather than building five new
> pickers from scratch), set/clear `rank` for manual ordering, and
> remove an item. For any row with `source: 'subscription'`, show it as
> read-only (no remove button) with a note that it's tied to an active
> subscription, per Step 2's precedence rule. This page can reasonably
> link out to Step 1's facility-subscription admin view for anyone who
> lands here trying to remove a subscription-sourced row and needs to
> actually cancel the underlying subscription instead.

---

## Step 5 — Backfill existing `facility_profile.is_top_rated` data

**Files:** new `.sql` file,
`/Users/anwarsadat/Desktop/WORK/top_rated_backfill.sql`.

**Prompt:**

> Write a one-time backfill: for every `facility_profile` row where
> `is_top_rated = true`, insert a corresponding `top_rated_items` row
> (`module: 'facility'`, `item_id: facility_profile.id`, snapshot
> `title`/`image_url`/`avg_rating` into the denormalized fields). For
> `source`: since Step 1 didn't exist until now, none of these existing
> `true` rows can be genuinely `'subscription'`-sourced yet (there was
> nowhere for a real enrollment to come from) — backfill all of them as
> `'manual'`. Once real facility subscriptions start getting activated
> through Step 1, Step 2's logic takes over correctly from there; this
> backfill is just carrying forward whatever was already flagged by
> hand before this system existed. Use `insert ... on conflict (module,
> item_id) do nothing` so this is safe to re-run. Run and verify row
> counts match (`select count(*) from facility_profile where
> is_top_rated = true` vs. `select count(*) from top_rated_items where
> module = 'facility'`) before moving to Step 6.

---

## Step 6 — Cutover + cleanup

**Files:** repo-wide (both repos), plus a final `.sql` file.

**Prompt:**

> Once Steps 0–5 are deployed and the admin curation UI (Step 4) plus
> facility subscription enrollment (Step 1) are the only ways top-rated
> status changes going forward:
>
> 1. Update `get_facilities_map`'s `p_is_top_rated` filter to join
>    against `top_rated_items` instead of reading
>    `facility_profile.is_top_rated` directly (`exists (select 1 from
>    top_rated_items where module = 'facility' and item_id =
>    facility_profile.id)`), so the map and the home shelf agree on a
>    single source of truth. Confirm no other RPC/query still reads the
>    old column before this ships.
> 2. Search both repos for remaining reads of
>    `facility_profile.is_top_rated` / `.avg_rating` and
>    `useTopRatedFacilities`, and migrate or remove them.
> 3. Decide whether to drop `facility_profile.is_top_rated`/`avg_rating`
>    outright or leave them as inert historical columns for one release
>    cycle first (recommend the latter — same reasoning as the fitness
>    plan refactor's Step 8.2 — since `avg_rating` may still be written
>    by an existing review-aggregation trigger that Step 0 needs to have
>    already accounted for; don't drop a column something else is still
>    writing to).
> 4. Confirm `top_rated_items` query performance with `EXPLAIN ANALYZE`
>    once real data exists, validating the `(rank, rating desc, added_at
>    desc)` index from Step 0 is actually used.
> 5. Replace `transactions/_components/SubscriptionsTab.tsx`'s hardcoded
>    mock rows/KPIs with a real query against `facility_subscriptions`
>    (Step 1) — this was already known-fake per Grounding, and now that
>    the real table exists there's no reason to leave the admin-facing
>    transactions view lying to whoever reads it.

---

## Suggested execution order

Step 0's investigation must happen first and in full — it determines
whether `top_rated_items` needs the `'subscription'` source value at all
in practice. Step 1 (facility subscription enrollment) is genuinely new
groundwork and can happen in parallel with Step 0 — they don't depend on
each other, only Step 2 depends on both. Steps 2 → 3 can ship together
(closes the actual "read from a normalized table" goal) — note Step 3
doesn't strictly need Step 1 to be done first, since manual (`source:
'manual'`) top-rated items work with or without subscriptions existing;
if the subscription piece is going to take longer, Steps 0/2/3/4/5/6 can
ship as a complete manual-curation system first, with Step 1's
subscription wiring landing as a follow-up that only adds the
`'subscription'` source path into an already-working Step 2. Step 4
(admin UI) can be built in parallel with Step 3 once Step 2's API shape
is settled. Step 5 (backfill) should run only after Step 2 is confirmed
correct in production — backfilling against a write path that's still
wrong just means redoing the backfill. Step 6 is cutover + cleanup, do
it last, deliberately, same as the fitness plan refactor's own Step 8.
