import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { getAdminClient } from "@/lib/db/admin";
import { getRequestUser } from "@/lib/mobile-auth";

/**
 * GET /api/content/catalogue — the whole editorial catalogue in one response.
 *
 * ── The problem it solves ───────────────────────────────────────────────
 *
 * Conditions, symptoms, healthy-living articles, categories, the home
 * carousel and top-rated placements are byte-identical for every user. They
 * change when an admin publishes, not when a user does anything. Yet a cold
 * app start fetched all six from PostgREST, per user, across ~150 ms of
 * Accra→Dublin each time. Ten thousand users cold-starting meant Postgres
 * answering the same six questions ten thousand times.
 *
 * Here they are answered once per TTL and reused.
 *
 * ── Why the cache is on the DATA, not the response ──────────────────────
 *
 * The obvious move is `s-maxage` and letting Vercel's edge serve it. That
 * requires the response not to vary per user — which means dropping auth.
 * These tables are `authenticated`-only today (`anon` cannot read
 * `conditions`), so making the route public would widen access to health
 * content that currently requires a login. That is a product decision, not a
 * performance one, and it was decided against.
 *
 * So: the route stays authenticated and dynamic, and `unstable_cache` wraps
 * the database work instead. Every request still runs — it verifies a JWT
 * in-process, which is cheap — but only one request per TTL reaches Postgres.
 * The database-load win is identical. What is given up is the edge hop:
 * requests still terminate in Dublin rather than at a PoP near the user.
 *
 * If the catalogue is ever made public, move the TTL onto a
 * `Cache-Control: s-maxage` header and delete the `unstable_cache` wrapper.
 *
 * ── Freshness ───────────────────────────────────────────────────────────
 *
 * Time-based by default: at most TTL_SECONDS of staleness after a publish.
 * For exact invalidation, have the admin publish path call
 * `revalidateTag(CATALOGUE_TAG)` — the tag is exported for that purpose.
 */

export const CATALOGUE_TAG = "content-catalogue";

/** How long a fetched catalogue is reused before the next request refreshes it. */
const TTL_SECONDS = 600;

// Column lists mirror the mobile hooks exactly, so the payload can feed the
// same components without a translation layer. Keep them in sync:
//   hooks/use-condition.ts       CONDITION_LIST_COLUMNS
//   hooks/use-symptom.ts         SYMPTOM_LIST_COLUMNS
//   hooks/use-healthy-living.ts  HEALTHY_LIVING_LIST_COLUMNS
const CONDITION_COLUMNS = "id, name, slug";
const SYMPTOM_COLUMNS = "id, name";
const HEALTHY_LIVING_COLUMNS = "id, name, slug, description, image_url";

export interface CataloguePayload {
  conditions: unknown[];
  symptoms: unknown[];
  healthyLiving: unknown[];
  categories: unknown[];
  homeCarousel: unknown;
  topRated: unknown[];
  /** When this snapshot was built, ISO 8601. */
  generatedAt: string;
  /** Seconds this snapshot is considered good for. */
  ttlSeconds: number;
  /** Slices that failed to load, by name. Empty on a clean build. */
  degraded: string[];
}

/**
 * Fetch every slice in parallel.
 *
 * Runs as service role. That is safe here precisely because the payload does
 * not depend on who is asking — there is no per-user row to leak. The caller
 * has already been authenticated by the route; this function only decides
 * WHAT the catalogue is, never WHO may see it.
 *
 * A failing slice degrades rather than failing the whole response: a broken
 * carousel should not take conditions down with it. The `degraded` array names
 * whatever fell over so the client (and you) can tell an empty catalogue from
 * a broken one.
 */
async function buildCatalogue(): Promise<CataloguePayload> {
  const admin = getAdminClient();
  const degraded: string[] = [];

  const [conditions, symptoms, healthyLiving, categories, carousel, topRated] =
    await Promise.all([
      admin.from("conditions").select(CONDITION_COLUMNS).order("name"),
      admin.from("symptoms").select(SYMPTOM_COLUMNS).order("name"),
      admin.from("healthy_living_info").select(HEALTHY_LIVING_COLUMNS).order("name"),
      admin.from("categories").select("*").order("name"),
      admin.rpc("get_home_carousel"),
      admin.from("top_rated_items").select("*").order("rank", { ascending: true }),
    ]);

  const take = <T>(
    name: string,
    res: { data: T | null; error: { message: string } | null },
    fallback: T,
  ): T => {
    if (res.error) {
      console.error(`[catalogue] ${name} failed:`, res.error.message);
      degraded.push(name);
      return fallback;
    }
    return res.data ?? fallback;
  };

  return {
    conditions: take("conditions", conditions, []),
    symptoms: take("symptoms", symptoms, []),
    healthyLiving: take("healthyLiving", healthyLiving, []),
    categories: take("categories", categories, []),
    homeCarousel: take("homeCarousel", carousel, null),
    topRated: take("topRated", topRated, []),
    generatedAt: new Date().toISOString(),
    ttlSeconds: TTL_SECONDS,
    degraded,
  };
}

/**
 * The cached wrapper. One key, no arguments — there is exactly one catalogue,
 * shared by everyone.
 */
const getCachedCatalogue = unstable_cache(buildCatalogue, ["content-catalogue-v1"], {
  revalidate: TTL_SECONDS,
  tags: [CATALOGUE_TAG],
});

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const catalogue = await getCachedCatalogue();

    return NextResponse.json(catalogue, {
      headers: {
        // `private` is deliberate and load-bearing: the response is gated by a
        // bearer token, so no shared cache — CDN, proxy or otherwise — may keep
        // a copy. Device-level reuse for a minute is fine and saves a request
        // on rapid re-opens; TanStack Query on the client does the real work.
        "Cache-Control": "private, max-age=60",
        // Lets you confirm from the client whether a response came from a warm
        // cache without reading server logs.
        "X-Catalogue-Generated-At": catalogue.generatedAt,
        "X-Catalogue-Degraded": catalogue.degraded.length
          ? catalogue.degraded.join(",")
          : "none",
      },
    });
  } catch (err) {
    // Every individual slice already degrades on its own, so reaching here
    // means something structural. Fail loudly rather than serving an empty
    // catalogue that the app would cache as if it were real.
    console.error("[catalogue] build failed:", err);
    return NextResponse.json(
      { error: "Catalogue temporarily unavailable" },
      { status: 503 },
    );
  }
}
