# Marketing

Campaigns and discounts, plus the marketing analytics tab.

Tenth feature migrated under E3.2. `features/anatomy` is the exemplar.

**Subscription plans and subscribers moved out.** This feature used to also
own the plan catalog, the subscriber lifecycle table and Pass Requests (via a
Subscriptions tab, `plan-dialog.tsx`, `subscriberColumns.tsx`,
`data/useSubscriptions.ts` and `schema/subscription.ts`). All of that was one
of four scattered subscription-management surfaces — the others were
Settings' Plans tab and Fitness's own Subscriptions tab — and has been
consolidated into `features/subscriptions`, the one real surface for it now.
See `features/subscriptions/README.md` for the full map.

## Layout

```
features/marketing/
  ui/       MarketingPage (tab shell) + 4 tabs + 3 dialogs + stats,
            and the two DataTable column configs
  api/      7 route handlers, one module per endpoint
  data/     useMarketing, useDiscounts
  schema/   profile.ts, discount.ts (the zod shapes)
```

## Routes

All seven API URLs unchanged; `app/` holds a re-export per route.

| URL | Verbs | Handler |
| --- | --- | --- |
| `/api/marketing/analytics` | GET | `api/analytics.ts` |
| `/api/marketing/campaigns` | GET, POST | `api/campaigns.ts` |
| `/api/marketing/campaigns/[id]` | GET, PATCH, DELETE | `api/campaigns-detail.ts` |
| `/api/marketing/campaigns/[id]/review` | POST | `api/campaigns-review.ts` |
| `/api/marketing/campaigns/batch` | POST | `api/campaigns-batch.ts` |
| `/api/marketing/discounts` | GET, POST | `api/discounts.ts` |
| `/api/marketing/discounts/[id]` | GET, PATCH, DELETE | `api/discounts-detail.ts` |

Permissions are `marketing.{view,create,edit,delete}`.

Page: `/marketing` → `ui/MarketingPage`. `/marketing/discounts` was collapsed
into it (M-D6) and is a redirect in `next.config.ts` rather than a
`page.tsx` stub, and the smoke sweep asserts it. `/marketing/subscriptions`
used to be the same kind of redirect (to `?tab=subscriptions`); now that the
tab is gone, it redirects straight to `/subscriptions` instead.

**`discount-dialog.tsx`'s "Eligible Plans" picker reads
`@/features/subscriptions/data/usePlans`** — a deliberate cross-feature
import. Discounts can target specific plans, and the plan catalog is owned by
`features/subscriptions` now, not here.

## `/api/subscriptions/*` is NOT this feature

Nothing under `/api/subscriptions/*` is owned here. `/api/subscriptions/admin`
and `/api/subscriptions/admin/bulk` are grant/revoke, used by
`features/subscriptions`; `/api/subscriptions/plans*` and
`/api/subscriptions/subscribers*` are the routes this feature's plan/subscriber
handlers moved to; `/api/subscriptions/requests` is a **mobile contract
route** consumed by the Expo app's `hooks/use-subscription-upgrade.ts` — it
was already outside this feature and stays that way.

## The Subscribers tab was returning 500

`GET /api/marketing/subscribers` embedded
`user_profiles(… , email, …)`. **`user_profiles` has no `email` column** — it
lives in `auth.users` — and an unknown column fails the *whole* PostgREST
query, so the endpoint returned
`{"error":"column user_profiles_1.email does not exist"}` and the tab listed no
subscribers at all.

This is the second time this exact bug has been fixed here; see the comment in
`app/api/map/collectors/route.ts`, which hit it and chose to drop the column.
This route resolves it instead, because the tab renders an email column:
`admin.auth.admin.listUsers()` (service role — PostgREST cannot reach the
`auth` schema), scanning pages only until every user id on the current page is
accounted for, and folding the result in **before** `applyUserMasking` so email
is masked for non-super-admins like every other identifier. A lookup failure
degrades to null emails rather than 500ing, which is the failure the change
exists to remove.

It predates the migration: the move's diff across all twelve handlers is the
`@/lib/supabase-admin` → `lib/db/admin` rename and nothing else.

## Mobile contract

None of the twelve routes is contracted. `marketing_profile` **is** a
contracted table and `log_marketing_event` a contracted RPC, so writes here
land in a shape the Expo app reads — additive changes only. The two RPCs this
feature calls (`get_marketing_overview`, `log_admin_activity`) are admin-only.

## Data access

`api/*` uses `getAdminClient()` after `requireAdminApiUser(permission)`; all
twelve handlers were converted off the deprecated `@/lib/supabase-admin` shim.
`data/*` uses the browser client.

## Things that will surprise you

- **`marketing_profile.updatedAt` is camelCase**, unlike almost every other
  table in this database. `updated_at` does not exist on it.
- **`schema/profile.ts` imports `@/types/formInput`.** It did so by relative
  path (`../types/formInput`) before the move, which silently re-pointed inside
  the feature once relocated — the trap described in `docs/cleanup-handoff.md`.
