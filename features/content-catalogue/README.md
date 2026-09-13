# features/content-catalogue

One cached read of every editorial slice the mobile app needs at cold start.

## What it owns

| | |
| --- | --- |
| Route | `GET /api/content/catalogue` — `app/api/content/catalogue/route.ts` re-exports from `api/catalogue.ts` |
| Tables read | `conditions`, `symptoms`, `healthy_living_info`, `categories`, `top_rated_items` |
| RPCs called | `get_home_carousel` |
| Mobile depends on it | **Not yet.** Additive — nothing consumes it until the app is wired up. |
| Writes | None. Read-only. |

## Why it exists

These six slices are byte-identical for every user. They change when an admin
publishes, not when a user does anything. Before this route, a cold app start
fetched all six from PostgREST per user, each across ~150 ms of Accra→Dublin.
Ten thousand users cold-starting meant Postgres answering the same six
questions ten thousand times.

Now it answers them once per 10 minutes.

## The design decision worth knowing

The obvious implementation is a public route with `s-maxage`, served from
Vercel's edge and never reaching Dublin at all. That needs the response not to
vary per user — which means no auth.

`conditions`, `symptoms` and `healthy_living_info` are `authenticated`-only
today; `anon` cannot read them. A public route would widen access to health
content that currently requires a login. That is a product decision, and it
was decided against.

So the route stays authenticated and dynamic, and `unstable_cache` wraps the
database work instead. Every request runs and verifies a JWT in-process (cheap,
no round trip — see `lib/mobile-auth.ts`), but only one request per TTL reaches
Postgres. **The database-load win is identical.** What is given up is the edge
hop.

If the catalogue is ever made public, move the TTL to a `Cache-Control:
s-maxage` header and delete the `unstable_cache` wrapper.

## Freshness

Time-based, 10 minutes. An admin publish is invisible for at most that long.

For exact invalidation, call `revalidateTag(CATALOGUE_TAG)` from the admin
publish path:

```ts
import { revalidateTag } from "next/cache";
import { CATALOGUE_TAG } from "@/features/content-catalogue/api/catalogue";

revalidateTag(CATALOGUE_TAG);
```

Not wired up yet — 10 minutes is fine for editorial content. Add it when
someone complains.

## Degradation

Each slice fails independently. A broken carousel returns `null` for that key
and names itself in `degraded[]` rather than taking conditions down with it.
Only a structural failure returns 503 — deliberately, because an empty
catalogue that the app caches as real is worse than an error it retries.

Response headers `X-Catalogue-Generated-At` and `X-Catalogue-Degraded` let you
check cache warmth and slice health from the client without reading logs.

## Wiring the mobile app up — not done yet

This route returns the **whole** catalogue unpaginated; the hooks currently
paginate server-side. Payload is a few tens of KB, smaller than one screen of
images, so sending it all is the right trade: one request replaces six, and
browse-by-letter becomes a local filter instead of a round trip.

The integration must keep the direct-PostgREST path as a fallback:

```ts
try {
  const res = await fetch(`${API_URL}/api/content/catalogue`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(String(res.status));
  return await res.json();
} catch {
  // Exactly today's behaviour. The new route can then only ever add
  // availability, never remove it.
  return readCatalogueFromPostgrestDirectly();
}
```

**Do not ship the integration without that fallback.** A cache that turns into
an outage is worse than no cache. Combined with the disk cache in
`lib/query-persist.ts`, a total network failure shows yesterday's content
rather than a spinner.

## Adding a slice

Add the query to `buildCatalogue`, add the key to `CataloguePayload`, and note
the table above. Keep the column lists matching the mobile hooks —
`CONDITION_LIST_COLUMNS` and friends — or the payload stops being a drop-in.
