# Marketing

Campaigns, discounts, subscription plans and subscribers, plus the marketing
analytics tab.

Tenth feature migrated under E3.2. `features/anatomy` is the exemplar.

## Layout

```
features/marketing/
  ui/       MarketingPage (tab shell) + 5 tabs + 4 dialogs + stats,
            and the three DataTable column configs
  api/      12 route handlers, one module per endpoint
  data/     useMarketing, useDiscounts, useSubscriptions
  schema/   profile.ts, discount.ts, subscription.ts (the zod shapes)
```

## Routes

All twelve API URLs unchanged; `app/` holds a re-export per route.

| URL | Verbs | Handler |
| --- | --- | --- |
| `/api/marketing/analytics` | GET | `api/analytics.ts` |
| `/api/marketing/campaigns` | GET, POST | `api/campaigns.ts` |
| `/api/marketing/campaigns/[id]` | GET, PATCH, DELETE | `api/campaigns-detail.ts` |
| `/api/marketing/campaigns/[id]/review` | POST | `api/campaigns-review.ts` |
| `/api/marketing/campaigns/batch` | POST | `api/campaigns-batch.ts` |
| `/api/marketing/discounts` | GET, POST | `api/discounts.ts` |
| `/api/marketing/discounts/[id]` | GET, PATCH, DELETE | `api/discounts-detail.ts` |
| `/api/marketing/plans` | GET, POST | `api/plans.ts` |
| `/api/marketing/plans/[id]` | GET, PATCH, DELETE | `api/plans-detail.ts` |
| `/api/marketing/subscribers` | GET | `api/subscribers.ts` |
| `/api/marketing/subscribers/[id]` | PATCH | `api/subscribers-detail.ts` |
| `/api/marketing/subscribers/remind` | POST | `api/subscribers-remind.ts` |

Permissions are `marketing.{view,create,edit,delete}`.

Page: `/marketing` → `ui/MarketingPage`. `/marketing/discounts` and
`/marketing/subscriptions` were collapsed into it (M-D6); they are now
redirects in `next.config.ts` rather than `page.tsx` stubs, and the smoke sweep
asserts both.

## `/api/subscriptions/*` is NOT this feature

Two routes sit next door and are deliberately left in `app/`:

- **`/api/subscriptions/admin`** is used by `features/fitness`
  (`SubscriptionsTab`, `UsersTab`), not by anything here.
- **`/api/subscriptions/requests`** is a **mobile contract route** consumed by
  the Expo app's `hooks/use-subscription-upgrade.ts` — and it is called from
  this feature's `data/useSubscriptions.ts`.

So that surface has two owners and one frozen consumer. Moving it into either
feature would be a guess; it stays put until someone decides.

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
