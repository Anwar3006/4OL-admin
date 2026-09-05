# The mobile contract

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
