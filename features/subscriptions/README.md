# Subscriptions

The one real surface for subscription-plan management: the plan catalog,
every entitlement grant (paid, admin-granted, or bulk-granted), the
subscriber lifecycle, and Pass Requests. Grants cover the entire app, Fitness
only, or Period Tracker only.

**This feature is no longer mid-migration.** It used to be a KPI shell with
its entitlements UI borrowed from `features/fitness`. Subscription-plan
management was scattered across four surfaces — Marketing's Subscriptions
tab, Settings' narrower Plans tab, Fitness's own read-only plan mirror plus
its Grant/Revoke and Bulk-grant panels, and this page's half-built KPI bento
— and has been consolidated here. Marketing keeps only Discounts and
campaign features; Settings' Plans tab is retired entirely; Fitness's
Subscriptions tab is deleted (its one unrelated piece, the alert composer,
now lives in `features/fitness/ui/FitnessAlertComposer.tsx`).

## Layout

```
features/subscriptions/
  ui/       SubscriptionsPage (tab shell: Overview | Plans | Subscribers | Requests),
            OverviewTab, PlansTab, plan-dialog, SubscribersTab, subscriberColumns,
            RequestsTab
  api/      plans.ts, plans-detail.ts, subscribers.ts, subscribers-detail.ts,
            subscribers-remind.ts, overview.ts — one module per endpoint
  data/     useSubscriptionsStats (entitlements list/stats), usePlans,
            useSubscribers, useRequests, useSubscriptionsOverview
  schema/   subscription.ts — SUBSCRIPTION_PRODUCTS enum + the plan zod shapes
```

## Routes

| URL | Verbs | Handler | Permission |
| --- | --- | --- | --- |
| `/api/subscriptions/plans` | GET, POST | `api/plans.ts` | `subscriptions.view` / `subscriptions.manage` |
| `/api/subscriptions/plans/[id]` | GET, PATCH, DELETE | `api/plans-detail.ts` | `subscriptions.view` / `subscriptions.manage` |
| `/api/subscriptions/subscribers` | GET | `api/subscribers.ts` | `subscriptions.view` |
| `/api/subscriptions/subscribers/[id]` | PATCH | `api/subscribers-detail.ts` | `subscriptions.manage` |
| `/api/subscriptions/subscribers/remind` | POST | `api/subscribers-remind.ts` | `subscriptions.manage` |
| `/api/subscriptions/overview` | GET | `api/overview.ts` | `subscriptions.view` |
| `/api/subscriptions/admin` | GET, POST, PATCH | `app/api/subscriptions/admin/route.ts` — **not moved, not touched** |  `subscriptions.view`, grant/revoke additionally gated to `super_admin` |
| `/api/subscriptions/admin/bulk` | POST | `app/api/subscriptions/admin/bulk/route.ts` — **not moved, not touched** | `subscriptions.view` + `super_admin` |
| `/api/subscriptions/requests` | GET, PATCH | `app/api/subscriptions/requests/route.ts` — **not moved, not touched, mobile-contracted** | — |

The first six routes moved here from `features/marketing/api/` (plans,
subscribers) and are new (`overview`). `app/` holds a one-line re-export per
route, same as every other feature.

**`app/api/subscriptions/admin{,/bulk}` and `/requests` are deliberately
untouched by this migration** — same files, same paths, same behaviour, only
now *read* by this feature's UI instead of Fitness's. See "Why two endpoints
instead of one" below for `admin`, and the mobile contract section for
`requests`.

### Permission: `subscriptions.manage`, finally wired up

Plan CRUD used to be gated by `marketing.edit`/`marketing.delete` (Marketing)
and, separately, `settings.billing` (Settings' narrower duplicate) — two
inconsistent gates for the same underlying table. `subscriptions.manage`
("Grant or revoke premium/lifetime subscriptions") already existed in
`lib/permissions.ts` but nothing checked it. It's wired up now: every GET here
requires `subscriptions.view`, every write (plan create/edit/delete, and the
subscriber-lifecycle edits — cancel, auto-renew toggle, mark at-risk, send
reminder) requires `subscriptions.manage`. The `admin` role already held both
permissions by default (same as it held `marketing.edit`), so no existing
admin lost access.

**Grant/revoke of premium or lifetime access is a separate, stricter gate and
this migration does not touch it.** `app/api/subscriptions/admin`'s POST/PATCH
(and `admin/bulk`'s POST) check `role === 'super_admin'` explicitly, on top of
`subscriptions.view` — untouched, unmoved, exactly as it was before this
feature existed.

## Why SubscribersTab composes two endpoints instead of one

`SubscribersTab` needs to show, in one place: (a) the marketing-lifecycle
view over `user_subscriptions` — auto-renew, risk reason, renewal reminders,
cancel — and (b) `period_premium_grants` rows (scope `period_only`), which
never appear in `user_subscriptions` at all and don't support any of those
lifecycle actions.

`app/api/subscriptions/admin` GET already merges both tables into one
response (`record_type: "subscription" | "period_grant"`) for the Entitlements
list and its Grant/Revoke actions. The two ways to get one merged table were:
extend that route's `select()` with the marketing columns, or keep it
untouched and compose two queries client-side. This went with **the second
option** — `admin/route.ts` stays byte-for-byte what it was before this
migration (a deliberate choice given it is real payment/entitlement state,
already covered by an explicit `super_admin` gate, and already consumed
elsewhere by `useSubscriptionsStats`) — so `SubscribersTab` renders two
sections instead: the paginated, filterable "All Subscribers"/"At Risk"
tables (`/api/subscriptions/subscribers`, the marketing-lifecycle view) above
an "Entitlements" table (`/api/subscriptions/admin`, unchanged) that shows
every scope including Period Tracker passes, with the Grant/Revoke and
Bulk-grant panels between them. It reads as one continuous subscriber
management surface even though it's two queries under the hood — auto-renew,
risk reason and reminders only ever render for rows that can actually have
them, rather than being faked for period grants.

## The Overview KPI RPC: Marketing kept its own call, minus the field nobody read

`get_marketing_overview()` bundles subscriber KPIs (premium users, MRR,
retention, at-risk) with campaign/discount KPIs in one jsonb payload.
Marketing's old Subscriptions tab called it via
`features/marketing/api/analytics.ts`, which returned the whole thing as an
`overview` field. That route has one other consumer,
`features/marketing/ui/AnalyticsTab.tsx` — and reading it confirmed
`AnalyticsTab` only ever destructured `performance` / `channels` /
`top_campaigns_by_ctr` / `funnel` (all computed from `marketing_profile`
directly), never `overview`. So the RPC call in `analytics.ts` was removed
outright rather than kept for a value nothing read — Marketing now makes zero
calls to `get_marketing_overview()`. This feature's `api/overview.ts` calls
the RPC itself and returns only the `subscribers` slice, which
`OverviewTab`'s four new KPI cards (Premium Users / MRR / Retention % /
At-Risk) read.

## Mobile contract

**`/api/subscriptions/requests` is mobile-contracted**
(`tests/contract/mobile-contract.ts`; consumer `hooks/use-subscription-upgrade.ts`
in the Expo app) and its RPC, `request_subscription_upgrade`, is contracted
too. Neither the route's shape nor the RPC's signature changed — `RequestsTab`
only adds a UI on top of the existing route.

Nothing else here is contracted: `/api/subscriptions/plans*`,
`/api/subscriptions/subscribers*`, `/api/subscriptions/overview` and
`/api/subscriptions/admin*` are all admin-only, free to restructure.

**Contracted tables read here:** `subscription_tiers`, `user_subscriptions`
and `period_premium_grants` are all read by the mobile app's own entitlement
RPCs (`get_subscription_tiers`, `get_my_entitlement`), even though those RPCs
aren't in the contract file — column shapes must stay additive. `get_my_entitlement()`
bridges `scope='all_access'` to full Period Tracker entitlement even with no
`period_premium_grants` row; the Grant panel's three scope options (moved
verbatim from the old Fitness file) encode this correctly — don't rewrite that
logic from memory if you touch it.

## Data access

`api/*` uses `getAdminClient()` after `requireAdminApiUser(permission)`.
`data/*` hooks use `apiFetch`/`fetch` against these routes — no client-side
Supabase anywhere in this feature.

## Things that will surprise you

- **`user_subscriptions.scope` and `subscription_tiers.product_scope` are
  different axes.** `scope` (`all_access`/`fitness_only`) classifies a
  *grant*; `product_scope` (`full_access`/`plasence`/`fitness`) classifies a
  *plan*. `SubscribersTab` and `PlansTab` each read the one that applies to
  them — don't conflate them.
- **Deleting a plan is now possible from the UI.** The backend
  (`api/plans-detail.ts` DELETE) always protected core tiers (free/premium/
  lifetime) and any plan with active subscribers; the old Marketing tab never
  wired a Delete button to it. `PlansTab` does now, with the same
  protections.
- **`features/marketing/ui/discount-dialog.tsx` imports `usePlans` from
  here.** Discounts can target specific plans; that's a legitimate
  cross-feature read, not a leftover.
- **`app/api/subscriptions/admin{,/bulk}` are not part of this feature's
  `api/` slot** — they're intentionally left in `app/` exactly where they
  were, see "Why two endpoints" above.
