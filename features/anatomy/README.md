# Anatomy

The body-map feature: body parts, their 3D hotspots, and the links from a body
part to conditions, symptoms, healthy-living tips, drugs and exercises.

**This module is the E3.1 exemplar.** It is the first feature moved out of the
`app/` sprawl, and the shape below is the proposal for every other feature.
Review the shape, not just the diff — the point of doing one feature first is
to disagree cheaply.

## Layout

```
features/anatomy/
  ui/       13 client components. AnatomyPage is the tab shell; the rest are
            one tab each, plus AddBodyPartDialog.
  api/      10 route handlers, one module per endpoint. Exports GET/POST/etc.
  data/     react-query hooks (useAnatomy) and the OpenAI pin mapper.
  schema/   the row and response shapes the UI renders.
```

`app/` keeps a file per route that re-exports from here and holds no logic:

```
app/(dashboard)/anatomy/page.tsx   -> export { default } from ".../ui/AnatomyPage"
app/api/anatomy/<name>/route.ts    -> export { GET, POST } from ".../api/<name>"
```

**URLs are unchanged.** That is the whole reason for the re-export files: Next
derives routes from the `app/` directory, so the folder structure there is a
URL contract, not an organisational choice. Moving the handler out and leaving
a one-line entry is what lets the code be organised by feature while the URLs
stay put.

## Where things are

| Want to change | Edit |
| --- | --- |
| A tab's UI | `ui/<Tab>.tsx` |
| What an endpoint returns | `api/<name>.ts` |
| A query, cache key or mutation | `data/useAnatomy.ts` |
| A row shape | `schema/types.ts` |
| The URL a route is served at | `app/api/anatomy/…` — and only then |

## Data access

Every module here uses the canonical clients from `lib/db/*`, never the
deprecated `@/lib/supabase*` shims:

- `api/*` → `getAdminClient()` (service role, bypasses RLS) after
  `requireAdminApiUser(permission)`.
- `data/useAnatomy.ts` → `getBrowserClient()` (cookie session, RLS enforced).

That split is not stylistic. Several anatomy junction tables have RLS enabled
with no policy for `authenticated`, so a browser-client read returns an empty
set **without erroring** — `healthy_living_body_parts`, `fitness_body_parts`
and `drug_body_parts` all shipped broken this way. Anything reading those goes
through an API route. See `lib/db/README.md`.

## Mobile contract

None of the 10 API routes here is called by the Expo app — mobile reaches
anatomy through Postgres RPCs and by reading `anatomy_regions` directly. So
these routes are free to change shape.

The RPCs are **not**. These are frozen (see `tests/contract/mobile-contract.ts`):

```
get_anatomy_body_part_bundle   get_anatomy_body_part_items
get_anatomy_premium_config     get_anatomy_quiz
get_anatomy_region_content     log_anatomy_interaction
```

Add parameters with defaults; never drop or reorder one. `p_preview_limit` and
`p_include_items` are the pattern to copy.

`schema/types.ts` is hand-written and describes what the endpoints return
today. It is not generated, so it can drift from the database — that is E5.2.

## Things that will surprise you

- **`public/anatomy/` did not move and must not.** `scene.html` and the GLB
  models under `public/anatomy/models/` are served at `/anatomy/scene.html`
  etc.; `public/` paths are URLs. `scene.html` is also duplicated in the Expo
  repo and the two are hand-synced — changing one means changing both.
- **`anatomy_hotspots` (2D) is empty and always has been.** The Body Map tab
  falls back to region cards because of it. `anatomy_hotspots_3d` is the table
  in use.
- **Body parts need the `path` trigger.** `body_parts.path` is `ltree NOT NULL`
  with no default; `trg_body_parts_set_path` derives it. Before that trigger
  existed the "+ Add Body Part" button had never once worked.
- **Junction rows carry `source`.** Rows tagged `source='heuristic'` were
  backfilled in bulk and can be reverted without touching hand-curated links.
