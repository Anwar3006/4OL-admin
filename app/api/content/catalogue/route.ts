/**
 * Route entry only — see features/content-catalogue/README.md.
 * Handler lives in features/content-catalogue/api/catalogue.ts.
 *
 * Route segment config stays HERE, not in the feature module: Next reads these
 * exports by statically analysing the route file and does not follow a
 * re-export. Moving them into the handler drops them silently.
 *
 * `force-dynamic` is the honest declaration — the handler reads the
 * Authorization header, so this route can never be statically rendered. The
 * caching lives one level down, on the database reads, via `unstable_cache`.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export { GET } from "@/features/content-catalogue/api/catalogue";
