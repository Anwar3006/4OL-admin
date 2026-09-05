# Period

The Period Tracker: cycles, daily logs, forecasts, the content library, the
Trivia campaign, TTC (trying-to-conceive) profiles, premium grants and the
privacy/consent surface. Also the AI Hub workspace that drafts Trivia
questions and library content.

Fourth feature migrated under E3.2. `features/anatomy` is the exemplar — read
that README for the reasoning behind the layout.

Unlike the first three, this one arrived pre-split: E4.1 had already broken a
3,419-line page and a 1,166-line route into tabs and handlers. This migration
moved those pieces into the feature and gave the shared shapes a home.

## Layout

```
features/period/
  ui/       PeriodPage (tab shell) + 9 tabs, the table config (columns) and
            cell formatters, TopicCategorySelect, and the AI Hub workspace
            with its two thin scope pages.
  api/      9 route handlers + data-helpers.ts, shared by the two /data verbs.
  data/     period-calculator, fertility-insights, request-auth,
            trivia-security. Server-side logic, not react-query hooks — this
            feature's UI fetches through the /api/period/data endpoint.
  schema/   types.ts (Row/Tab), period-tracker.ts (tab vocabulary + pure
            helpers) and data-requests.ts (the zod request shapes).
```

## Routes

All eleven URLs are unchanged. `app/` holds one re-export per route.

| URL | Verbs | Handler | Authorises with |
| --- | --- | --- | --- |
| `/api/period/me` | GET, POST | `api/me.ts` | caller's own JWT |
| `/api/period/library` | GET, POST | `api/library.ts` | caller's own JWT |
| `/api/period/trivia` | GET, POST | `api/trivia.ts` | caller's own JWT |
| `/api/period/trivia/fulfillment` | POST | `api/trivia-fulfillment.ts` | caller's own JWT |
| `/api/period/data` | GET | `api/data-get.ts` | `period.view` |
| `/api/period/data` | POST | `api/data-post.ts` | `period.edit` |
| `/api/period/categories` | GET | `api/categories.ts` | `period.content` |
| `/api/period/analytics` | GET | `api/analytics.ts` | session user, RLS |
| `/api/ai-hub/period` | GET, POST | `api/ai-hub.ts` | `ai.view` / `ai.manage` |

Pages: `/period` → `ui/PeriodPage`, `/ai-hub/period` → `ui/AiHubTriviaPage`,
`/ai-hub/period/content` → `ui/AiHubContentPage`.

## Mobile contract

**Four of these routes are frozen** (`tests/contract/mobile-contract.ts`):

```
/api/period/me       /api/period/library
/api/period/trivia   /api/period/trivia/fulfillment
```

The Expo app calls them from `features/plasence/api.ts`. Never drop a field,
rename the route, or tighten an RLS policy behind them without shipping a
mobile release first. New request parameters get defaults.

`submit_period_trivia` was **added to `CONTRACT_RPCS` by this migration.**
`/api/period/trivia` POST delegates to it, so mobile depends on it
transitively — but it was not listed, which left it free to change signature
or vanish while the route above it looked protected. That is the exact gap
that let `/api/auth/device-sign-in/send-otp` call a function that did not
exist. `review_period_trivia_event` and `review_period_cycle_revision` are
reachable only from the admin-only `/api/period/data`, so they stay
uncontracted on purpose.

`lib/period-calculator.ts` — now `data/period-calculator.ts` — is **ported in
parallel** to `4-Our-Life-App/src/features/plasence/calculations.ts` for
offline mobile estimates. The two are kept in sync by a shared test fixture,
not by shared runtime code. Changing a formula here means changing it there.

## Data access

`api/*` uses `getAdminClient()` after `requireAdminApiUser(permission)`, except
where the endpoint is deliberately acting **as the caller**:

- `api/me.ts`, `library.ts`, `trivia.ts`, `trivia-fulfillment.ts` resolve the
  user through `data/request-auth.ts`. Mobile has no cookie jar, so it sends
  `Authorization: Bearer <token>` and that token is forwarded as the client's
  own auth header. RLS still resolves `auth.uid()` from the same JWT — this is
  not a service-role bypass.
- `api/analytics.ts` uses `getServerClient()` and reads only the signed-in
  user's own `period_cycles`.

Nothing here imports the deprecated `@/lib/supabase*` shims; the migration
converted the eight modules that did.

## Things that will surprise you

- **`export const runtime = "nodejs"` lives in `app/`, not here.** Next reads
  route segment config by statically analysing the route file, so it does not
  follow a re-export. Moving those lines into the feature modules would have
  silently dropped the config. In Next 16 `nodejs` is also the default and
  `edge` is deprecated, so these exports are now belt-and-braces — but they
  are kept where Next can actually see them.
- **`api/data-{get,post}.ts` are one URL, not two.** `/api/period/data` is a
  tab-dispatching endpoint: `?tab=` selects which of 14 datasets it returns.
  The tab vocabulary is `PERIOD_TAB_IDS` in `schema/period-tracker.ts`, and it
  is shared with the UI — that is the `schema/` slot doing its job.
- **`TopicCategorySelect` used to live in `components/period_tracker/`**, a
  one-file directory outside the feature. It is `ui/` now.
- **Trivia lead PII is encrypted at rest** by `data/trivia-security.ts` and
  needs `PERIOD_LEAD_ENCRYPTION_KEY` and `TRIVIA_DEVICE_PEPPER` (both ≥32
  chars). The module throws `*_NOT_CONFIGURED` rather than storing plaintext.
- **`schema/types.ts` is hand-written** and can drift from the database. That
  is E5.2, not solved here.
