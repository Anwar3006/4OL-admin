# AI Hub

The AI Hub: model registry, recommendation stats, moderation queue and AI analytics.

Migrated under E3.2. `features/anatomy` is the exemplar — read that README
for the reasoning behind this layout.

## Layout

```
features/ai/
  ui/       1 files — components
  api/      7 files — route handlers, one module per endpoint
  data/     2 files — hooks and queries
  schema/   (empty)
```

## Routes

All URLs unchanged; `app/` holds a re-export per route and no logic.

| URL | Verbs | Handler |
| --- | --- | --- |
| `/api/ai/analytics` | GET | `api/analytics.ts` |
| `/api/ai/metrics` | GET | `api/metrics.ts` |
| `/api/ai/models` | GET, POST | `api/models.ts` |
| `/api/ai/models/[id]` | PATCH | `api/models-detail.ts` |
| `/api/ai/moderation-queue` | GET, POST | `api/moderation-queue.ts` |
| `/api/ai/overview` | GET | `api/overview.ts` |
| `/api/ai/recommendations` | GET | `api/recommendations.ts` |

Permissions: `ai.manage`, `ai.view`.

## Mobile contract

No route here is called by the Expo app, so these are free to change shape.

RPCs called (all admin-only and uncontracted): `get_ai_analytics`, `get_ai_hub_overview`, `moderate_content`.

## Data access

`api/*` uses `getAdminClient()` after `requireAdminApiUser(permission)`; the
handlers were converted off the deprecated `@/lib/supabase-admin` shim during
the migration. `data/*` uses the browser client. See `lib/db/README.md`.
