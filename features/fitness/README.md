# Fitness

Exercises, plans, challenges, trainers, outdoor routes and events, FitCoins,
health-app integrations, WhatsApp broadcasts, and the AI plan generator.

Fifth and largest feature migrated under E3.2 — ~15,000 lines across 50 files.
`features/anatomy` is the exemplar; read that README for the reasoning.

**This migration emptied `hooks/supabase-calls/` of its fitness hooks (42 → 35
files).** That directory reaching zero is E3.2's finish line.

## Layout

```
features/fitness/
  ui/       FitnessPage (tab shell) + 14 tabs + 18 dialogs + exerciseColumns.
            tabs.ts is the barrel the page imports.
  api/      7 route handlers, one module per endpoint.
  data/     7 react-query hooks + generate-plan.ts (the OpenAI plan builder,
            server-side, used by both generate routes).
  schema/   moderation.ts — the vocabularies ui/ and api/ must agree on.
```

## Routes

All eight URLs unchanged; `app/` holds a re-export per route and no logic.

| URL | Verbs | Handler | Permission |
| --- | --- | --- | --- |
| `/api/fitness/fitcoins` | GET, PATCH, POST, PUT | `api/fitcoins.ts` | `fitcoins.view` / `fitcoins.manage` |
| `/api/fitness/fitcoins/redemptions/[id]/status` | PATCH | `api/fitcoins-redemption-status.ts` | `fitcoins.manage` |
| `/api/fitness/generate` | POST | `api/generate.ts` | caller's own JWT |
| `/api/fitness/generate-admin` | POST | `api/generate-admin.ts` | caller's own JWT |
| `/api/fitness/notifications` | POST | `api/notifications.ts` | `fitness_notifications.send` |
| `/api/fitness/outdoor-incentives` | GET, PUT | `api/outdoor-incentives.ts` | `fitness.view` / `fitness.edit` |
| `/api/fitness/outdoor-routes/[id]/verify` | POST | `api/outdoor-routes-verify.ts` | `fitness.edit` |

Page: `/fitness` → `ui/FitnessPage`, with 14 tabs selected by `?tab=`.

## Mobile contract

**`/api/fitness/generate` is frozen.** The Expo app calls it from
`hooks/use-fitness-onboarding.ts`. It takes a `Bearer` token rather than an
admin session — it is the one route here that serves the app, not the admin.

Twelve fitness RPCs and eighteen fitness tables are also contracted; see
`tests/contract/mobile-contract.ts`. The eight RPCs this feature calls
(`get_fitness_users`, `get_fitness_dashboard_kpis`, `get_fitness_ai_log_stats`,
`get_fitness_schedule_stats`, `get_fitness_health_sync_stats`,
`admin_review_fitcoin_redemption`, `notify_fitness`, `log_admin_activity`) are
admin-only and deliberately **not** contracted — checked during the migration,
because a contracted route delegating to an uncontracted RPC is how
`/api/auth/device-sign-in/send-otp` and `submit_period_trivia` both slipped
through. `/api/fitness/generate` calls no RPC at all.

The contracted tables it writes — `fitness_plans`, `fitness_plan_days`,
`fitness_plan_exercises`, `fitness_exercises`, `fitness_challenges`,
`fitness_outdoor_routes`, `fitness_outdoor_events`, `fitness_user_assignments`,
`fitness_onboarding_selections`, `user_profiles` — are read directly by the app
through PostgREST. Dropping or renaming a column here breaks installed builds.

## Data access

`api/*` uses `getAdminClient()` after `requireAdminApiUser(permission)`, except
the two generate routes, which authenticate the caller's own Bearer token and
then use the admin client to write on their behalf, rate-limited via
`checkRateLimit`. `data/*` hooks use the browser client. Nothing here imports
the deprecated `@/lib/supabase*` shims; the migration converted all eight
modules that did.

## Things that will surprise you

- **`fitness_content_schedule` is readable by `anon`.** It carries an
  `admin_full_access_fit_sched` policy written `FOR ALL TO public USING (true)`,
  and `public` in Postgres means every role. It is the one table the E1.3 sweep
  left open, because `data/useFitnessContentSchedule.ts` is the only browser
  read of it — closing the policy first would blank the Schedule tab silently.
  **Move that read behind an API route, then drop the policy.** See
  `docs/cleanup-handoff.md`.
- **`UserSearchSelect` used to live here** and the Map feature reached across
  for it with `@/app/(dashboard)/fitness/_components/...`. It is generic, so it
  is `components/UserSearchSelect.tsx` now.
- **`schema/moderation.ts` exists because both halves had hand-copied the same
  vocabularies** — the redemption actions as a `z.enum` in the route and an
  inline union in the tab. They agreed, which is how `BODY_SYSTEMS` looked
  before it didn't.
- **`ui/tabs.ts` is a barrel**, not a route file. `_tabs/index.ts` before.
- **`data/generate-plan.ts` is 829 lines** and is the largest single file left
  in the feature. It is server-side only, despite living in `data/`.
