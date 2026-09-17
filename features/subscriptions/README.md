# Subscriptions

The app-wide entitlements overview: grants covering the entire app, Fitness
only, or Period Tracker only. One place for a scope that used to have no
home of its own.

## Layout (partial — mid-migration)

```
features/subscriptions/
  ui/       1 file  — SubscriptionsPage.tsx (route shell + KPI overview)
  data/     1 file  — useSubscriptionsStats.ts
```

This feature does **not** yet have `api/` or `schema/` slots. The route
handler still lives at `app/api/subscriptions/admin/route.ts` (not moved
here), and the actual grant/revoke/entitlements-table UI still lives in
`features/fitness/ui/SubscriptionsTab.tsx` — `SubscriptionsPage` renders it
directly across the feature boundary. Both are pre-existing, not introduced
by the KPI redesign that added `data/useSubscriptionsStats.ts`; finishing
the migration (moving the route handler here, giving the entitlements UI
its own home, adding `schema/`) is separate work, not done as a side effect
of a KPI-card change.

## Routes

| URL | Verbs | Handler |
| --- | --- | --- |
| `/api/subscriptions/admin` | GET, POST, PATCH | `app/api/subscriptions/admin/route.ts` (not yet moved into this feature) |
| `/api/subscriptions/admin/bulk` | POST | `app/api/subscriptions/admin/bulk/route.ts` |

Permission: `subscriptions.view`. Grant/revoke/bulk-grant are further
restricted to `super_admin` (explicit role check, not the permission
catalog — see the route's own comments).

## Mobile contract

Not in `tests/contract/mobile-contract.ts` — admin-only, free to change shape.

**Contracted tables read here:** `user_subscriptions`, `period_premium_grants`,
`subscription_tiers` are all read by the mobile app's own entitlement checks,
so column shapes must stay additive even though this admin route isn't
itself contracted.

## Data access

`useSubscriptionsStats` fetches `/api/subscriptions/admin?limit=1` and reads
the `stats` field the route computes from rows it already has in memory for
pagination — no extra database query. That includes `new_grants_trend`, a
real 8-week series (grants bucketed by `created_at`) powering the one
sparkline on this page — every other number here is a snapshot with no
history to chart, so don't add a trend prop to those cards without a real
series behind it. It intentionally does not fetch the full entitlements
list; `SubscriptionsTab` (in `features/fitness`) owns that separately with
its own pagination.
