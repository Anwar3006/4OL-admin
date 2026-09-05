# The mobile contract

> **Updated 5 Sept 2026 — the contract nearly doubled.** It is now **31 routes,
> 42 RPCs, 38 tables** (was 16 / 28 / 34). Nothing about the mobile app
> changed; the list finally caught up with it. See "Why this was wrong twice"
> below before trusting any earlier number in this file.

## Why this was wrong twice

**Pass 1** grepped `hooks/` and `services/` only: 13 routes, missed three
called from `lib/` and `context/` — including the device sign-in flow.

**Pass 2** was hand-built at 16 routes and missed **fifteen** more. They live
in the mobile app's `app/`, `components/`, `features/` and `hooks/chat/`
directories, which that pass never read:

| Missed | Consumer |
| --- | --- |
| `/api/chat/{conversations,messages,messages/read,groups,members,attachment}` | `hooks/chat/*` |
| `/api/period/{me,library,trivia,trivia/fulfillment}` | `features/plasence/api.ts` |
| `/api/jobs/attachment`, `/api/medenquiry/attachment` | screens under `app/(app)/(auth)/` |
| `/api/send-otp`, `/api/verify-otp` | `components/auth/OTPForm.tsx` |
| `/api/user/redeem-promo` | the fitness premium screen |

Plus 14 RPCs (device sign-in, push tokens, app review) and 4 tables.

**Why nobody noticed:** `scripts/cleanup/regenerate-mobile-contract.sh` exists
to prevent exactly this, and it could not run. It gated on
`command -v rg`, which **succeeds when a shell defines `rg` as a function** —
as Claude Code's shell does — and then fails inside the script's own bash
subshell with "ripgrep (rg) required". So the guard against a stale contract
was itself broken, silently, and the list was never once diffed against the
Expo repo. The script now falls back to `grep`.

That is the same shape as every other bug on this branch: **a check that
cannot run reports the same thing as a check that passes.**

## One live mobile bug found while regenerating

`lib/device-approval.ts:187` in the Expo app calls
`verify_device_sign_in_otp`. **That function does not exist in the database**,
and there is no near-name match — the family is `request_device_sign_in`,
`resolve_device_sign_in`, `get_device_sign_in_status`. The OTP step of device
sign-in cannot work.

It is deliberately **not** in `CONTRACT_RPCS`: that list is asserted against
the live database, so adding it would turn a mobile bug into a permanently red
admin test. Fixing it means creating the function or removing the call, both
outside this repo. **Not yet reported to the mobile team.**

## Regenerating

```bash
bash scripts/cleanup/regenerate-mobile-contract.sh ../4-Our-Life-App
```

Diff the output against `tests/contract/mobile-contract.ts`. Run it before any
release that moves a route, renames an RPC, or tightens an RLS policy.

The live signature check now runs green against production with credentials
set:

```bash
NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SECRET_KEY=… pnpm test:contract
```


The Expo app (`4-Our-Life-App`) depends on this repo and this database in
three ways. Together they are the only surface a restructure can break from
outside. Everything else — 220-odd API routes, every other RPC, every other
table — has no external consumer.

| Coupling | Count | What a change means |
| --- | --- | --- |
| Admin API routes | **16** | Rename or move one and installed builds 404. |
| Postgres RPCs | **28** | Resolved by argument *name*. Reorder or rename a parameter and the call stops matching. |
| Tables read directly | **34** | RLS policy *is* the API. Tighten one and the app silently shows nothing. |

Old builds live on phones for months. **Every change here must be additive.**

## Enforcement

| File | Guards |
| --- | --- |
| `tests/contract/mobile-contract.ts` | The manifest — routes, verbs, consumers, RPCs, tables |
| `tests/contract/api-routes.test.ts` | Each route file still exists and exports its verbs |
| `tests/contract/rpc-signatures.test.ts` | Live signatures match `rpc-signatures.json` |
| `scripts/cleanup/regenerate-mobile-contract.sh` | Re-derives the list from the mobile repo |

`pnpm test:contract` runs the first three. The RPC check skips itself without
`SUPABASE_SECRET_KEY`, so fork PRs stay green.

## Why the manifest is not the source of truth

It was wrong the first time. A pass over `hooks/` and `services/` alone found
13 routes and missed three — `/api/auth/device-context`,
`/api/auth/device-sign-in/send-otp` and `/api/user/push-token` — because they
are called from `lib/` and `context/`. A safety net with holes is worse than
no net, because it is trusted.

So before any release that touches a route, an RPC or an RLS policy:

```bash
bash scripts/cleanup/regenerate-mobile-contract.sh ../4-Our-Life-App
```

and diff the output against the manifest.

## The 16 routes

| Route | Verbs | Called from |
| --- | --- | --- |
| `/api/user/profile` | GET, PATCH | `hooks/use-userProfile.tsx` |
| `/api/user/avatar` | GET, PATCH | `hooks/use-userProfile.tsx` |
| `/api/user/active` | POST | `hooks/use-active-tracking.ts` |
| `/api/user/entitlement` | GET | `hooks/use-entitlement.ts` |
| `/api/user/app-config` | GET | `hooks/use-my-account.ts` |
| `/api/user/activity-logs` | GET, POST | `services/activityLogsService.ts` |
| `/api/user/notifications` | GET, PATCH, POST | `hooks/use-notifications.ts` |
| `/api/user/favorites` | GET, POST, DELETE | `hooks/use-facilities.ts` |
| `/api/user/content-engagement` | GET, POST, DELETE | `hooks/use-content-engagement.ts` |
| `/api/user/delete-account-request` | GET, POST, PATCH | `hooks/use-my-account.ts` |
| `/api/user/push-token` | PATCH | `lib/push-tokens.ts` |
| `/api/chat/support` | GET, POST, PATCH | `hooks/use-support-tickets.ts` |
| `/api/fitness/generate` | POST | `hooks/use-fitness-onboarding.ts` |
| `/api/subscriptions/requests` | GET, PATCH | `hooks/use-subscription-upgrade.ts` |
| `/api/auth/device-context` | GET | `lib/device-approval.ts` |
| `/api/auth/device-sign-in/send-otp` | POST | `lib/device-approval.ts` |

### Two of these are untyped JavaScript

`app/api/user/delete-account-request/route.js` and
`app/api/search/dynamic/route.js`. The repo sets `strict: true` but also
`checkJs: false`, so the highest-risk files in the codebase — public contract,
consumed by clients that cannot be rolled back — are the ones TypeScript never
looks at. Convert these two first when E5 starts.

### One deprecated route

`/api/search/dynamic` returns **410 Gone** and must stay that way. It
previously ran unauthenticated `select *` scans over `facility_profile` and
leaked PII. The mobile app references it only in a comment.

## What this does not yet check

Response *shape*. `api-routes.test.ts` proves a route still exists and still
answers the right verbs — the cheap regressions. It does not prove the JSON
body still has the fields the app reads.

Adding that needs a running server and a signed-in test user. The natural
place is the Playwright project (`tests/smoke`), which already authenticates:
add a `contract.spec.ts` that calls each route with the saved session and
asserts required fields. Worth doing before E3 moves any of the 16.
